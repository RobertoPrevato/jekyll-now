---
layout: post
title: Running Docker applications in Azure Application Service Plan
---

This post explains how to deploy web applications in [Azure Application Service Plans](https://docs.microsoft.com/en-us/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview), using [Docker](https://www.docker.com) containers and custom images from Docker Hub. My previous two posts described:
* how to provision services in [Azure using ARM templates and Azure CLI 2.0](https://robertoprevato.github.io/How-to-provision-Azure-resources-using-Azure-CLI-and-ARM-templates/)
* how to create custom [Docker images to host Python applications](https://robertoprevato.github.io/How-to-run-PyPy-powered-web-apps-in-Docker/)

I will continue the topic, explaining: 
* how to push a custom Docker image to a public registry in [Docker Hub](https://hub.docker.com)
* how to prepare an ARM template to deploy a Docker powered web application in Azure Application Service Plan
* how to configure Docker containers so they can be accessed through SSH, optionally by application settings

I decided to write this blog post because I couldn't find examples of ARM templates with images pulled from Docker Hub. Even though the only page I [found in MSDN](https://docs.microsoft.com/en-us/azure/app-service/containers/tutorial-custom-docker-image) is useful, as it describes many interesting things, it lacks description of ARM templates configuration and it links to a GitHub repository that doesn't exist.

---

Like I did for my previous post, I published final code in GitHub, here: [https://github.com/RobertoPrevato/AzureDocker](https://github.com/RobertoPrevato/AzureDocker). For this tutorial, I prepared images and code for three kinds of applications:
* [Go 1.9.1](https://golang.org) app using [net/http module](https://golang.org/pkg/net/http/)
* [CPython 3.6.2](https://www.python.org) app using [asyncio](https://docs.python.org/3/library/asyncio.html), [uvloop](https://magic.io/blog/uvloop-blazing-fast-python-networking/) (libuv) and [httptools](https://github.com/MagicStack/httptools)
* [PyPy 3](http://pypy.org) app using [Gunicorn](http://gunicorn.org), [Gevent](http://sdiehl.github.io/gevent-tutorial/#greenlets), [Flask](http://flask.pocoo.org)

Any of these images can be deployed to Azure, following instructions below.

## Publishing an image to Docker Hub
Practicing with the things described here requires a Docker account. Creating a Docker account is free and enables creating unlimited public repositories and a single private one, in [Docker Hub](https://hub.docker.com).

![Docker Hub](https://robertoprevato.github.io/images/posts/azuredocker/docker-hub-account.png)

Assuming that you already have prepared a Dockerfile, or cloned one of my two repositories ([1](https://github.com/RobertoPrevato/PyDocker), [2](https://github.com/RobertoPrevato/AzureDocker)), let's start by building an image from a `Dockerfile`. If the image is built with a name that starts with: **docker_account_name/**, later it can be pushed directly to Docker Hub; otherwise command `docker tag` is required.

In this example, I use tag procedure.
```bash
docker build -t imagename:tag .
```

Then:
```bash
# find the id of the image
docker images

# tag image id, to include account name
docker tag 000000000000 accountname/imagename:tag
```

The image can then be pushed to Docker Hub, using `push` command:

```bash
docker login

docker push accountname/imagename:tag
```

## Deployment using ARM templates
ARM template configuration for Docker images, require these settings:
* the server farm resource must have following property:
```json
"kind": "linux"
```
* the web site resource must have this property:
```json
"kind": "app,linux"
```
* finally, to use a custom image from a public Docker Hub registry, the application need to have this specific application setting **DOCKER_CUSTOM_IMAGE_NAME**

```json
"resources": [
  {
    "name": "appsettings",
    "type": "config",
    "apiVersion": "2016-08-01",
    "dependsOn": [
      "[resourceId('Microsoft.Web/sites', variables('webSiteName'))]"
    ],
    "tags": {
      "displayName": "Application settings"
    },
    "properties": {
      "DOCKER_CUSTOM_IMAGE_NAME": "[parameters('dockerImageName')]"
    }
  }
]
```

Working ARM templates can be found [here](https://github.com/RobertoPrevato/AzureDocker). To deploy, it's necessary to specify a unique name for the application, at user's discretion. Using [Azure CLI](https://robertoprevato.github.io/How-to-provision-Azure-resources-using-Azure-CLI-and-ARM-templates/):

```bash
export RGNAME=dockertutorial-rg

# create resource group in desired location
az group create --name $RGNAME --location "westeurope"

# deploy ARM template
az group deployment create --name tutorial --resource-group $RGNAME --template-file azuredeploy.json --parameters applicationName=UNIQUE_APP_NAME
```

Et voilà! If everything goes as it should, your application will be deployed in Azure.

![Deployed resource group](https://robertoprevato.github.io/images/posts/azuredocker/docker-tutorial-rg.png)

And web application settings have a populated Docker container section.

![Docker container configuration in web application](https://robertoprevato.github.io/images/posts/azuredocker/azure-docker-container.png)

**Bad news**: the first run, and sometimes restarting the image, may take several minutes; in fact so many that you're likely going to doubt it works, like I did a few times in these days. Azure also offers a [Container Registry](https://azure.microsoft.com/en-us/services/container-registry/) service to store private images, and I am going to try it soon.

![Running application](https://robertoprevato.github.io/images/posts/azuredocker/azure-working-web.png)

As a side note, I did several tests using [Apache Benchmark](http://httpd.apache.org/docs/current/programs/ab.html), from Warsaw, Poland to applications running on Standard S1 machines in Western Europe Microsoft data center: both Go web applications using net/http module and Python 3.6.2 uvloop applications give excellent performance, with similar results, with Python uvloop httptools faster than Go net/http setup - but httptools has less features than net/http in Go). PyPy 3 + Gunicorn + Gevent + Flask and Python 3.6.2 Sanic + uvloop gave good results, too, while providing a more dev-friendly technology stack, in my opinion. Discussing this in details is out of the scope of this post.

## Accessing the machine from Azure Portal

Since we are using Linux machines to host our Docker container, the development tools differs from those of Windows machines. Running Docker containers may be accessed, **only from Azure portal**, through SSH. The container must expose port 2222 and have a running OpenSSH server, configured with a very specific password.

![Linux application blade](https://robertoprevato.github.io/images/posts/azuredocker/docker-app-blade.png)

Changes to Dockerfile, to include an OpenSSH server:
* template includes an `sshd_config` file
* port 2222 exposed
* OpenSSH server is installed and configured

```docker
# Configure ports
EXPOSE 2222 80

# Run apt-get, to install the SSH server, and supervisor
RUN apt-get update \ 
    && apt-get install -y supervisor \
    && apt-get install -y --no-install-recommends openssh-server \
    && echo "root:Docker!" | chpasswd \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy the sshd_config file to its new location
COPY sshd_config /etc/ssh/

# Start the SSH service
RUN service ssh start
```

Since it's not desirable to dedicate resources to OpenSSH server all the time, images should be designed to let turn on/off the SSH server by configuration. The solution I implemented for my machines involve checking an environmental variable and determine whether supervisord should start an OpenSSH server.

```bash
setup_ssh() {
  if ($ENABLE_SSH == "true")
  then
      echo "[*] Enabling SSH server"
      cp /app/supervisor/sshserver.conf /etc/supervisor/conf.d/
  else
      echo "[*] SSH server disabled by configuration"
      rm /etc/supervisor/conf.d/sshserver.conf 2> /dev/null
  fi
}

# start ssh service, only if ENABLE_SSH env variable is set to true
setup_ssh

echo "[*] Start supervisor"
supervisord -n
```

This way, it's sufficient to change an application setting with name 'ENABLE_SSH' to true/false and restart the machine, to enable or disable SSH development access from Azure Portal.

## Conclusions
Deploying applications running in Docker containers in Azure is fun and offers great opportunities to experiment with technology stacks. First deployment and restarting applications is a slow operation, when fetching images from Docker Hub, making this approach still complicated for production scenarios. Next I will check whether Azure [Container Registry](https://azure.microsoft.com/en-us/services/container-registry/) service offers better performance, being *at home*.

![All machines deployed in Azure](https://robertoprevato.github.io/images/posts/azuredocker/azure-tutorial-rg-demo-apps.png)
*All running applications.*
