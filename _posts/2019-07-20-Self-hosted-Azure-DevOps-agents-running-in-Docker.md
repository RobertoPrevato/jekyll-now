---
layout: post
title: Self-hosted Azure DevOps agents running in Docker
picture: https://labeuwstacc.blob.core.windows.net/posts/devopsagents.png
description: This post shares useful information about self-hosted Azure DevOps agents running in Docker, with Ubuntu.
---

In this post I share my experience with self-hosted agents for [Azure DevOps running in Docker](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/docker?view=azure-devops), with Ubuntu; and information about images I prepared and published in [GitHub](https://github.com/RobertoPrevato/AzureDevOps-agents) and [Docker Hub](https://hub.docker.com/u/robertoprevato).

Those who are passionate about Azure DevOps and Linux, like me, should find this topic exciting and fun. This post can interesting for those who are considering running their own agents for CI and CD pipelines for workloads running on Ubuntu, or want to know something more on how Azure Pipelines agents work.

It covers the following topics:
1. Quick introduction on the subject
1. Challenges of installing tools and my opinion, as a user
1. Some information on how to install tools on these machines
1. Presenting images I created: including one to use Docker inside Docker containers, for build pipelines that need to create and publish docker images

Following along requires intermediate knowledge about: 
* Azure DevOps and pipelines
* Docker and Linux

# Introduction
If you look for information about running private agents for Azure DevOps, you should end up in the MSDN documentation at this page:
* [Azure Pipelines agents](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/agents?view=azure-devops)

The documentation clearly describes what are agents and agent pools, what are the options offered by Azure DevOps out of the box, and some reasons why you might want to use your own machines to run your pipelines.

If you are into Docker, your eyes should rapidly catch the link called _"Running in Docker"_. 

![Running in Docker link](https://labeuwstacc.blob.core.windows.net/posts/running-in-docker.png)

Running private agents in Docker has key advantages:
* possibility to destroy and recreate agents from scratch rapidly
* possibility to create new images without making a whole host dirty, while experimenting and installing dependencies
* possibility to share images with others, and start new containers rapidly

Starting an agent this way is extremely easy, and requires only seven steps:

1. create a folder for the image
1. copy-paste the Dockerfile [provided in the documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/docker?view=azure-devops#create-and-build-the-dockerfile-1)
1. copy-paste a start script (`start.sh` for Linux agents)
1. build the docker image

    ```bash
    docker build -t dockeragent:latest .
    ```

1. create an access token
1. prepare a run command like in the box below
1. run the command

    ```bash
    docker run -e AZP_URL=<Azure DevOps instance> \
      -e AZP_TOKEN=<PAT token> \
      -e AZP_AGENT_NAME=mydockeragent \
      dockeragent:latest
    ```

When the machine starts, it will automatically connect to the given Azure DevOps organization, appearing inside the `Default` agent pool.

![Running Agent](https://labeuwstacc.blob.core.windows.net/posts/running-agent.png)

And the agent appears in the `Default` pool:

![Agent in default pool](https://labeuwstacc.blob.core.windows.net/posts/agent-in-default-pool.png)

If you want to use a different pool, you can do it by using an additional variable:

```bash
docker run -e AZP_URL=<Azure DevOps instance> \
  -e AZP_POOL='Self-hosted Ubuntu 16.04' \
  -e AZP_TOKEN=<PAT token> \
  -e AZP_AGENT_NAME=mydockeragent \
  dockeragent:latest
```

At this point, our agent running inside the Docker container can start taking jobs:

![Running pipeline](https://labeuwstacc.blob.core.windows.net/posts/running-pipeline.png)

## Love at first sight

My first impression is love at first sight: I truly feel enthusiastic about this feature. Later in this post I will criticize some decisions, so I want to make clear that I am very happy of my experience, and amazed by the amount of good stuff Microsoft is producing since it embraced open source.

So far I only described what you can find in MSDN, adding a few screenshots; in the next paragraphs I will describe something more, including my critique (in the sense of _review_) of the `start.sh` script offered by Microsoft documentation.

# The challenges

The first challenge to face, is: _How to install tools?_ Since I recalled tasks called _"Use Node.js"_ and _"Use Python"_, I decided to give them a try; certain that they would fail because I didn't have these tools on my agent.

![Use Node, use Python 3](https://labeuwstacc.blob.core.windows.net/posts/use-node-use-python3.png)

![Use Node, use Python 3 failure](https://labeuwstacc.blob.core.windows.net/posts/use-node-use-python3-failed.png)

To my surprise, the task for Node.js succeeded, while the task for Python failed, with error message:
```bash
##[error]Version spec 3.x for architecture x64 did not match any version in Agent.ToolsDirectory.
Versions in /azp/agent/_work/_tool:
```

Taking a look inside the running container...

```bash
docker exec -it container_name /bin/bash
```

Reveals that Node.js was installed inside `/azp/agent/_work/_tool`. Googling for information, I found the problem described by this good article by **Colin Domoney** [Local Build Agents for Azure DevOps](https://medium.com/@colin.domoney/local-build-agents-for-azure-devops-50e6046f87ea). To resolve the case with Python, it's necessary to create an exact folder structure, like the following:

```
/azp/agent/_work/_tool/Python/3.7.3/
                                    x64/bin/python3
                                    x64.complete     # <- empty file
```

Side note: I wrote a bash script that installs Python 3.7.3 to the right location, including symlinks, you can find it [here](https://github.com/RobertoPrevato/AzureDevOps-agents/blob/master/ubuntu16.04-python/scripts/installers/python373.sh).

This is just an example, but it shows how moving to private agents most likely requires some effort to achieve desired results.

## Restarts

The second question I asked myself was: _How do restarts and caching look like?_
I therefore stopped and restarted my container.

```bash
docker ps  # to find the name of the running container

docker stop container_name

docker start -i container_name
```

To my surprise, as the agent restarted, everything was gone: Python 3.7.3 I installed to the tools folder, and all files required to running the agent were also downloaded again.

I don't like two things in the start scripts that Microsoft offers to run private agents in Docker, both [PowerShell and Bash](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/docker?view=azure-devops).

1. Every single time the agent starts, it wipes out the agent files and downloads a ~88MB package of Agent Pipelines files - even though the package it's about to download it's the same version as the one currently present on file system (more on why this is wrong later)
1. The folder where it installs work tools (such as Node.js and Python), is by default a child of the agent folder, the one that gets wiped at each restart. Therefore, every time you need to restart your agent, you also need to download again all the tools when a pipeline run

Imagine a poor guy like me, who wants to enjoy faster builds and releases, by spinning up a Docker container inside his work laptop, not being able to benefit from `caching`, only because he doesn't have a dedicated, always-on machine for this.
Caching tools and build dependencies is one of the main reasons for using private agents in the first place, isn't it? As it happens, I don`t always have access to optical fiber.

<img src="https://labeuwstacc.blob.core.windows.net/posts/optical-fiber-meme.jpg" data-canonical-src="https://labeuwstacc.blob.core.windows.net/posts/optical-fiber-meme.jpg" width="200" height="200" />

And what's the point of downloading again a package that is no different than the one already on file system? I think especially about the Azure Pipelines agent files themselves (~88MB) and those tools that cannot be installed using official tasks.

I therefore improved, I dare to say, the bash script to do the following:

1. By default, it downloads the Azure Pipelines agent files only if _not already_ present on file system
1. It offers the _option_ to wipe out the files and download the latest version of the agent, if the user desires so
1. By default, it uses a different folder to store work tools, so they are not wiped out, even if the agents file are updated; it's Docker so if you want a clean machine, just start a new container
1. To support restarts, using a method already included in the `start.sh`, to reconfigure the agent across restarts

My script can be found [in this repository of mine: AzureDevOps-agents](https://github.com/RobertoPrevato/AzureDevOps-agents/blob/master/ubuntu16.04-base/start.sh). To force the update of the agent files, use an env variable `AZP_UPDATE=1`.

# Bonus content: Docker images I prepared
I often feel grateful that Microsoft embraced open source, I feel my job is way more fun now. You can find the scripts to build images for the [official Azure DevOps Hosted agents](https://github.com/microsoft/azure-pipelines-image-generation/tree/d649c0ceda61f397e4ec3defe18cfc9402ee3296/images/linux).

Studying and adopting these scripts, I prepared three Docker images that can be used as agents, with some pre-installed tools and with my `start.sh` file. By the way, I am using `Ubuntu 16.04` instead of `18.04`, because it's easier to adopt existing scripts for this OS version. 

Docker images used for CI and CD pipelines are not your everyday's Docker images: it is necessary to find a compromise between image size and having a pool of tools that can be used to cover many scenarios. In fact, the official hosted images look like "factotum" (note: I refused to write English plural form _factotums_ for a latin word), having a ton of tools.

My images can be used as reference, to create agents with other tools such as ASP.NET Core, Go, Rust, Ruby, etc. They are here: [https://github.com/RobertoPrevato/AzureDevOps-agents](https://github.com/RobertoPrevato/AzureDevOps-agents).

## Base image
A base image with my `start.sh` script and some tools, including Azure CLI, Azure DevOps extension for the CLI, azcopy, curl, wget, ca-certificates, tools to compile `C` libraries, etc. Maybe I am wrong, but I think libraries for C compilation are generally important on build agents - please leave a comment if you think I am wrong.

## Docker inside Docker
A base image with Docker, for build pipelines that need to create and publish Docker images.

To run it on a Linux host having Docker, use these command:

**For interactive run:**
```bash
# interactively:
docker run -it -v /var/run/docker.sock:/var/run/docker.sock devopsubuntu16.04-docker:latest /bin/bash

# run Azure DevOps agent:
AZP_URL=<YOUR-ORGANIZATION-URL> \
AZP_TOKEN=<YOUR-TOKEN> \
AZP_AGENT_NAME='Ubuntu 16.04 Docker' ./start.sh
```

**Straight to the point:**
```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock \
-e AZP_URL=<YOUR-ORGANIZATION-URL> \
-e AZP_TOKEN=<YOUR-TOKEN> \
-e AZP_AGENT_NAME='Ubuntu 16.04 Docker' devopsubuntu16.04-docker:latest
```

![Docker inside Docker](https://labeuwstacc.blob.core.windows.net/posts/docker-inception.png)

## Python.. of course
Of course, an image for Python 3.7.3, PyPy 3.5, Python 3.5 and Python 2.7 - because it's me. 🐍

# Hope you enjoyed this post
I am so excited about these things, I slept little lately and I wrote most of this post at night (to 3 AM); so I hope my work can help others. Cheers!
