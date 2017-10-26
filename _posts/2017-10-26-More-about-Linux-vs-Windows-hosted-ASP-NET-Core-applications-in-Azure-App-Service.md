---
layout: post
title: More about Linux vs Windows hosted ASP NET Core applications in Azure Application Service Plan
picture: https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/win-vs-linux-azure-host.png
---

In my [previous post](https://robertoprevato.github.io/Comparing-Linux-hosted-to-Windows-hosted-ASP-NET-Core-applications-in-Azure-Application-Service-Plan/) I wrote about performance comparison of [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/) applications hosted in Windows vs Linux + Docker, inside [Azure Application Service Plans](https://docs.microsoft.com/en-us/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview). Since this topic is interesting for many, I decided to write more about it. 

I tested again using a more repeatable and trustworthy approach: I generated web load using [Azure Cloud Agents; with Visual Studio and VSTS](https://docs.microsoft.com/en-us/vsts/load-test/getting-started-with-performance-testing), in the cloud. Moreover, *all* previous tests were executed using HTTP, new tests use HTTPS.

## Running the tests in the cloud!
Thanks to the amazing job done by Microsoft, [running performance tests in the cloud is really easy](https://docs.microsoft.com/en-us/vsts/load-test/getting-started-with-performance-testing). This is done using Visual Studio Web Performance tools and a VSTS account. Two series of load tests were executed for each of the following scenarios:
* "Hello, World" message with timestamp
* response with body of 1Kb
* response with body of 10Kb
* response with body of 50Kb
* response with body of 100Kb

all with following configuration:
* run for 5 minutes
* initial user count: 50
* every 10 seconds, increase users count by 10
* maximum user count: 150
* from the same data center where the applications are deployed: in Western Europe

![VSTS Cloud Tests List](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/load-tests-list.png)

Output includes a useful summary, graphs and errors report about violated performance thresholds, such as high CPU usage. 

![VSTS Cloud Test Summary](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/loadtest-summary.png)

I used the same tests prepared for the previous blog post and published here: [https://github.com/RobertoPrevato/ASPNetCoreHelloWorld](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld/tree/master/PerformanceTests/ASPNetCoreHelloWorldLoadTestProject).

![Drum rolling](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/drum-roll.gif)

## Analyzing results
Results are consistent with those obtained generating load from a computer connected through wire to the internet: the same ASP.NET Core application deployed in Linux and Docker is much faster than one deployed in Windows host (both inside Application Service Plan). These new tests show an even stronger dominance of the application hosted in Linux, especially when serving responses with bigger bodies.

#### Requests per second

| Scenario | Linux | Windows | Linux +% |
|----------|-------|---------|-------|
| Hello World | 646.6 | 432.85 | +49.38% |
| 1KB | 623.05 | 431.95 | +44.24% |
| 10KB | 573.6 | 361.9 | +58.5% |
| 50KB | 415.5 | 210.05 | +97.81% |
| 100KB | 294.35 | 143.25 | +105.48% |

---

#### Average response time (ms)

| Scenario | Linux | Windows | Linux -% |
|---------|-------|--------|-------|
| Hello World | 168.85 | 242.2 | -30.28% |
| 1KB | 171.25 | 249.8 | -31.45% |
| 10KB | 184.2 | 292.7 | -37.07% |
| 50KB | 233.3 | 542.85 | -57.02% |
| 100KB | 365.05 | 817.35 | -55.34% |


![VSTS Tests RPS mean](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/vsts-cloud-tests-rps-mean.png)

![VSTS Tests Averate Response Time](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/vsts-cloud-tests-avg-response-time.png)

## Where Linux host performed worse (is it?)
Almost all load tests on Linux host caused the surpassing of thresholds for [Processor: %Processor Time](https://technet.microsoft.com/en-us/library/bb734903.aspx), while none of tests run on Windows host produced the same kind of warning. I am not quite sure to understand the documentation when it describes this performance counter, included by default in all new load tests created using Visual Studio. If any reader may help me commenting below, I will be glad to know.

## Weird graphs for Windows performance and throughput
I noticed a weird pattern when observing performance and throughput graphs of load tests, in VSTS. While graphs for Linux run show graceful lines, Windows graphs show lines that look like saws teeths. Observe, for example, two runs for the 10Kb scenario:

![Linux 10Kb Graphs](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/linux-10kb-graphs.png)
_Linux 10Kb scenario graphs_

![Windows 10Kb Graphs](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/windows-10kb-graphs.png)
_Windows 10Kb scenario graphs_

More graph pictures can be found here: [https://github.com/RobertoPrevato/robertoprevato.github.io/tree/master/images/posts/aspcoredocker](https://github.com/RobertoPrevato/robertoprevato.github.io/tree/master/images/posts/aspcoredocker).

* [Linux 50Kb graphs](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/linux-50kb-graphs.png)
* [Windows 50Kb graphs](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/windows-50kb-graphs.png)

## Conclusion
At the light of [my previous tests](https://robertoprevato.github.io/Comparing-Linux-hosted-to-Windows-hosted-ASP-NET-Core-applications-in-Azure-Application-Service-Plan/) and the load tests described here, hosting applications using Linux and Docker in Azure Application Service Plan is a good choice, under performance point of view. 

## Final note

I have no interest in making Linux look better than Windows* - I published all source code of my tests and instructions on how to recreate the environments, if anybody suspects I tweaked the results or done anything wrong, she's welcome to repeat them and demonstrate my mistake. 

I decided to run these performance tests and to share the results, just because I am planning to create a web service for an application I wrote using Python, and I was wondering whether I was going to get satisfying performance using a Linux host with Docker, in Azure Application Service Plan. For this service I am planning to use [PyPy 3](http://pypy.org), [Gunicorn](http://gunicorn.org), [Gevent](http://sdiehl.github.io/gevent-tutorial/#greenlets) and [Flask](http://flask.pocoo.org) and as it happens, this stack seem to perform faster than ASP.NET Core with Kestrel - but this is yet another topic!

_(*) I happily use both Linux and Windows in my everyday life. I admit preferring Linux when coding privately, but I am not religious about it._