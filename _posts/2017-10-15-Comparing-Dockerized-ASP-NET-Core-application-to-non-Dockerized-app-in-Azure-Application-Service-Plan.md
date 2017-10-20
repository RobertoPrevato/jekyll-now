---
layout: post
title: Comparing Dockerized ASP.NET Core applications to regular applications in Azure Application Service Plan
---

How does an [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/) application hosted inside a Linux machine and Docker container, compares to the same application, hosted in a Windows machine (non-Dockerized); when using [Azure Application Service Plan](https://docs.microsoft.com/en-us/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview)?
Which setup offers the best performance, and to which extent?

I've been wondering about this lately, so I decided to test it, doing the following:
* I prepared a simple ASP.NET Core application, using NET Core 2.0 and C#,
* deployed one instance of this application in a [Standard S1](https://azure.microsoft.com/en-us/pricing/details/app-service/) Application Service Plan, using a regular Windows host in Western Europe data center
* deployed one instance in a [Standard S1](https://azure.microsoft.com/en-us/pricing/details/app-service/) Application Service Plan, using a Linux host and a Docker container, in Western Europe data center
* used [Apache Benchmark](https://httpd.apache.org/docs/2.4/programs/ab.html) to generate load from [Warsaw, Poland](https://goo.gl/maps/HV6JXHtubUz)
* repeated the tests using [Visual Studio Web Performance](https://msdn.microsoft.com/en-us/library/ms182551(v=vs.110).aspx) tests tooling, for the skeptical .NET programmers who only trust Microsoft approved technology
* compared the results

In both cases, the application is built using `dotnet` CLI in Release configuration, hosted using [Kestrel](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel?tabs=aspnetcore2x), behind the proxy server used by Azure service.
Each application has a dedicated Standard S1 service plan, therefore a dedicated virtual machine. Contextually, I also compare the Dockerized ASP.NET Core application to other technology stacks I've been testing in the last days (Go, Python 3.6.2, PyPy 3). Since Kestrel is internally using [libuv](https://en.wikipedia.org/wiki/Libuv), it will be interesting to compare it to [uvloop](https://github.com/MagicStack/uvloop), being the latter a wrapper for libuv and [asyncio](https://docs.python.org/3/library/asyncio.html). I think that many NET developers are proud of [Kestrel's speed and the job done by Microsoft engineers](https://www.ageofascent.com/2016/02/18/asp-net-core-exeeds-1-15-million-requests-12-6-gbps/), but ignore they should also thank libuv: a C library for asynchronous I/O that existed before and is used by other applications. And also that, when behind IIS, it [requires some extra considerations](https://weblog.west-wind.com/posts/2017/Mar/16/More-on-ASPNET-Core-Running-under-IIS).

## Preparation of the web application
The application is obtained starting from a [dotnet CLI web template](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-new?tabs=netcore2x) and is intentionally kept as simple as possible, to exclude other elements from the test, such as templating engines and JSON serialization. It features a single handler that can return two kinds of responses:
* an "Hello, World" message with a time stamp
* given a query string parameter _n_, between 1 and 100, a response with body of _n kB_

```cs
  app.Run(async (context) =>
  {
      var request = context.Request;
      var s = request.Query["s"];

      if (string.IsNullOrEmpty(s)) {
          // return simple hello, world
          var now = DateTime.UtcNow;
          await context.Response.WriteAsync($"Hello World, from ASP.NET Core and Net Core 2.0! {now.ToString("yyyy-MM-dd HH:mm:ss.FFF")}");
          return;
      }

      // {...}
  });
```

## Deployment in the Windows machine
For the deployment to Windows machine, I rapidly created a project in [VSTS (Visual Studio Team Services)](https://www.visualstudio.com/team-services/), provisioned the services using [ARM templates](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld/tree/master/webhelloworld/arm), built and deployed the application using regular VSTS tasks.

![VSTS](https://robertoprevato.github.io/images/posts/aspcoredocker/aspnetcore-vsts.png)

![Azure Deployment](https://robertoprevato.github.io/images/posts/aspcoredocker/perftests-win-rg.png)

Application source code and ARM templates are here in GitHub: [https://github.com/RobertoPrevato/ASPNetCoreHelloWorld](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld).

## Deployment in the Linux machine and Docker container
The Docker image has been prepared and published in the same fashion I described in my [previous posts, about running Docker images in Azure](https://robertoprevato.github.io/Running-Docker-applications-in-Azure/). Since I already described the process there, I am not going to repeat it here. The only thing worth mentioning is that it's not possible to mix Linux and Windows Application Service Plans inside the same resource group, so I created one resource group for each instance of the application.

![Azure Deployment](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/perftests-linux-rg.png)

Application source code and files for the Docker image are here in GitHub, together with ARM templates: [https://github.com/RobertoPrevato/AzureDocker](https://github.com/RobertoPrevato/AzureDocker).

## Running the tests
I started with Apache Benchmark. I like this tool because it's simple and fast to use, and gives useful output, such as requests per seconds and response time at different percentile, for example: 95% of requests terminated 220ms (or less), 5% of requests terminated in 44ms, etc. It's ideal to test the performance of single methods, but it doesn't support simulating sessions. As a side note, I used it together with Visual Studio Ultimate Performance Tests, and it gave consistent results.

I made tests with this kind of input: 5000 requests, simulating 150 concurrent users, using connections keep alive. Output answers this question: how much time it took to get responses for these 5000 requests?
```bash
ab -n 5000 -c 150 -k http://aspcorehelloworld-dev-westeurope-webapp.azurewebsites.net/
```

Output look something like, for a test that was run against the Linux and Docker instance:
```bash
This is ApacheBench, Version 2.3 <$Revision: 1757674 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking aspcorehelloworld-dev-westeurope-webapp.azurewebsites.net (be patient)


Server Software:        Kestrel
Server Hostname:        aspcorehelloworld-dev-westeurope-webapp.azurewebsites.net
Server Port:            80

Document Path:          /
Document Length:        72 bytes

Concurrency Level:      150
Time taken for tests:   19.322 seconds
Complete requests:      5000
Failed requests:        478
   (Connect: 0, Receive: 0, Length: 478, Exceptions: 0)
Keep-Alive requests:    0
Total transferred:      1674460 bytes
HTML transferred:       359460 bytes
Requests per second:    258.77 [#/sec] (mean)
Time per request:       579.662 [ms] (mean)
Time per request:       3.864 [ms] (mean, across all concurrent requests)
Transfer rate:          84.63 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:       70  417 367.3    394    9397
Processing:    43  126 129.8     93    1930
Waiting:       41  119 115.0     90    1629
Total:        117  542 395.9    505    9465

Percentage of the requests served within a certain time (ms)
  50%    505
  66%    554
  75%    583
  80%    604
  90%    819
  95%   1143
  98%   1279
  99%   3296
 100%   9465 (longest request)
```

Other notes:
* Tests have been executed at the same time of day on both instances
* 10 runs for each instance and for each setting

## Analyzing results
Lorem

## Comparison with other technology stacks in Docker
Lorem

## Conclusions
Lorem