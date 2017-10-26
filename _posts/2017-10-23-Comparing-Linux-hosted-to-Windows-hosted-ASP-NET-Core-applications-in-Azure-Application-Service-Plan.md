---
layout: post
title: Comparing Linux hosted to Windows hosted ASP.NET Core applications in Azure Application Service Plan
picture: https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/win-vs-linux-azure-host.png
---

What is faster? An [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/) application hosted inside a Linux machine and Docker container, or one hosted in a Windows machine, when using [Azure Application Service Plan](https://docs.microsoft.com/en-us/azure/app-service/azure-web-sites-web-hosting-plans-in-depth-overview)?
Which setup offers the best performance, and to which extent?

I've been wondering about this lately, so I decided to test it, doing the following:
* I prepared a simple ASP.NET Core application, using NET Core 2.0 and C#,
* deployed one instance of this application in a [Standard S1](https://azure.microsoft.com/en-us/pricing/details/app-service/) Application Service Plan, using a Windows host in Western Europe data center
* deployed one instance in a [Standard S1](https://azure.microsoft.com/en-us/pricing/details/app-service/) Application Service Plan, using a Linux host and a Docker container, in Western Europe data center
* used [Apache Benchmark](https://httpd.apache.org/docs/2.4/programs/ab.html) to generate load from [Warsaw, Poland](https://goo.gl/maps/HV6JXHtubUz), using a Ubuntu 17.04 client connected through Wi-fi
* repeated tests using [Visual Studio Web Performance Tests](https://msdn.microsoft.com/en-us/library/ms182551(v=vs.110).aspx) tools, generating load from the same location, using a Windows 10 client connected to the internet through cable
* analyzed output and compared the results

In both cases, the application is built using `dotnet` CLI in Release configuration, hosted using [Kestrel](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel?tabs=aspnetcore2x), behind the proxy server used by Azure service.
Each application has a dedicated Standard S1 service plan, therefore a dedicated virtual machine. Contextually, I also compare the Dockerized ASP.NET Core application to other technology stacks I've been testing in the last days (Go, Python 3.6.2, PyPy 3). Since Kestrel is internally using [libuv](https://en.wikipedia.org/wiki/Libuv), it will be interesting to compare it to [uvloop](https://github.com/MagicStack/uvloop), being the latter a wrapper for libuv and [asyncio](https://docs.python.org/3/library/asyncio.html) (Python built-in infrastructure for creating concurrent code). I think that many NET developers are proud of [Kestrel's speed and the job done by Microsoft engineers](https://www.ageofascent.com/2016/02/18/asp-net-core-exeeds-1-15-million-requests-12-6-gbps/), but ignore they should also thank libuv: a C library for asynchronous I/O that existed before and is used by [Node.js](https://nodejs.org/en/) and other applications. And also that, when behind IIS, it [requires some extra considerations](https://weblog.west-wind.com/posts/2017/Mar/16/More-on-ASPNET-Core-Running-under-IIS).

## Preparation of the web application
The application is obtained starting from a [dotnet CLI web template](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-new?tabs=netcore2x) and is intentionally kept as simple as possible. It has a single handler that can return two kinds of responses:
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
For the deployment to Windows machine, I rapidly created a project in [VSTS (Visual Studio Team Services)](https://www.visualstudio.com/team-services/), provisioned the services using [ARM templates](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld/tree/master/webhelloworld/arm), built and deployed the application using VSTS tasks.

![VSTS](https://robertoprevato.github.io/images/posts/aspcoredocker/aspnetcore-vsts.png)

![Azure Deployment](https://robertoprevato.github.io/images/posts/aspcoredocker/perftests-win-rg.png)

Application source code and ARM templates are here in GitHub: [https://github.com/RobertoPrevato/ASPNetCoreHelloWorld](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld).

## Deployment in the Linux machine using Docker container
The Docker image has been prepared and published in the same fashion I described in my [previous posts, about running Docker images in Azure](https://robertoprevato.github.io/Running-Docker-applications-in-Azure/). Since I already described the process there, I am not going to repeat it here. The only thing worth mentioning is that it's not possible to mix Linux and Windows Application Service Plans inside the same resource group, so I created one resource group for each instance of the application.

![Azure Deployment](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/perftests-linux-rg.png)

Application source code and files for the Docker image are here in GitHub, together with ARM templates: [https://github.com/RobertoPrevato/AzureDocker](https://github.com/RobertoPrevato/AzureDocker).

## Running the tests using Apache Benchmark
I like [Apache Benchmark](https://httpd.apache.org/docs/2.4/programs/ab.html) (ab) because it's comfortable to use and gives useful output, such as requests per seconds and response time at different percentile, for example: 95% of requests terminated within _n_ ms, 5% of requests terminated within _m_ ms, etc. It's ideal to test the performance of single methods. I ran several groups of tests, each at different times of day, with this kind of setup: 

| Scenario | Configuration |
|----------|---------------|
| Hello World  | 5000 requests, 150 concurrent users |
| 1KB body | 5000 requests, 150 concurrent users |
| 10KB body | 2000 requests, 150 concurrent users |
| 100KB body | 2000 requests, 150 concurrent users |

```
# usage example
ab -n 5000 -c 150 -l http://linuxaspcorehelloworld-dev-westeurope-webapp.azurewebsites.net/
```

Output look something like the following:
```
This is ApacheBench, Version 2.3 <$Revision: 1757674 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking linuxaspcorehelloworld-dev-westeurope-webapp.azurewebsites.net (be patient)


Server Software:        Kestrel
Server Hostname:        linuxaspcorehelloworld-dev-westeurope-webapp.azurewebsites.net
Server Port:            80

Document Path:          /
Document Length:        72 bytes

Concurrency Level:      150
Time taken for tests:   22.369 seconds
Complete requests:      5000
Failed requests:        0
Keep-Alive requests:    0
Total transferred:      1699416 bytes
HTML transferred:       359416 bytes
Requests per second:    223.53 [#/sec] (mean)
Time per request:       671.065 [ms] (mean)
Time per request:       4.474 [ms] (mean, across all concurrent requests)
Transfer rate:          74.19 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:       40  489 289.9    425    3813
Processing:    42  170 227.6    109    3303
Waiting:       41  153 152.9    105    2035
Total:        106  659 359.2    553    4175

Percentage of the requests served within a certain time (ms)
  50%    553
  66%    650
  75%    750
  80%    786
  90%    948
  95%   1036
  98%   1282
  99%   1918
 100%   4175 (longest request)
```
Finally, I aggregated results using a Python script and obtained average results across all tests, and produced two kinds of graphs:
* Requests per seconds (RPS) handled by server
* 95th percentile response time, in other words: within how many milliseconds the 95% of requests received a response

## Analyzing AB output

About 250K successful requests were submitted for _Hello World_, _1KB_ scenarios, while between 110K and 70K for _10KB_ and _100KB_ scenarios. Numbers are not exact because sometimes the Azure infrastructure closes the connection ("connection reset by peer"), but number of analyzed requests is high anyway. **Do not pay** particular attention to absolute values below: they make sense relatively to each other, since they depend on the client as well as on the server. Results below are obtained using a wi-fi connection.

| Host | Scenario | RPS (mean) | 95% within ms |
|--------|-------|--------|-------|
| Linux | Hello World | 232.61 | 1103.64 |
| Linux | 1KB | 228.79 | 1129.93 |
| Linux | 10KB | 117.92 | 1871.29 |
| Linux | 100KB | 17.84 | 14321.78 |
| Windows | Hello World | 174.62 | 1356.8 |
| Windows | 1KB | 171.59 | 1367.23 |
| Windows | 10KB | 108.08 | 2506.95 |
| Windows | 100KB | 17.37 | 16440.27 |

Results show that the same application hosted in Linux and Docker is much faster in handling HTTP Requests, when response body is small. The difference fades off as response body size increases, although the Linux setup is still slightly faster than Windows. This may seem surprising, since Windows hosting in Azure Application Service Plan is a more mature technology. On the other hand, Docker virtualization is cheap, compared to other ways to virtualize applications. There may be other configuration differences that make Linux host more efficient, which is especially visible for small response bodies.

| Scenario | Linux RPS |
|----------|-----------|
| Hello World | +33.21% |
| 1KB | +33.33% |
| 10KB | +9.1% |
| 100KB | +2.7% |

![RPS](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/rps-graph-win-vs-linux.png)

![95% 1](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/95p-graph-win-vs-linux-1.png)

![95% 2](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/95p-graph-win-vs-linux-2.png)

## Running the tests using Visual Studio Web Performance tools
Performance tests were repeated using Visual Studio Ultimate Web Performance tools, from the same location and using a different client over a wired connection. I published the source code of these tests [here in GitHub](https://github.com/RobertoPrevato/ASPNetCoreHelloWorld). In this case, load tests have been configured this way:
* run for 5 minutes
* initial user count: 50
* every 10 seconds, increase users count by 10
* maximum user count: 150

![Visual Studio Perfomance Tests](https://raw.githubusercontent.com/RobertoPrevato/ASPNetCoreHelloWorld/master/PerformanceTests/load-test-settings.PNG)

## Analyzing VS output
The results of Visual Studio Web Performance tests show different values, and even a greater difference in favour of the application hosted in Linux. The difference could be explained with these two elements:
* VS Web Performance tools may handle connections differently
* tests were executed from a different client, over a wired connection, whereas AB tests were executed from a client using Wi-fi

Nevertheless, it's legitimate to compare results with each other, when they are executed from the same client and using the same tools and configuration.

| Host | Scenario | RPS (mean) | 95% within ms |
|-------- |-------|--------|-------|
| Linux | Hello World | 649 | 340 |
| Linux | 1KB | 622 | 380 |
| Linux | 10KB | 568 | 370 |
| Linux | 100KB | 145 | 1220 |
| Windows | Hello World | 391 | 400 |
| Windows | 1KB | 387 | 420 |
| Windows | 10KB | 333 | 510 |
| Windows | 100KB | 108 | 1560 |

---

| Scenario | Linux RPS |
|----------|-----------|
| Hello World | +65.98% |
| 1KB | +60.72% |
| 10KB | +70.57% |
| 100KB | +34.26% |

![VS benchmark, RPS](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/vs-benchmark-rps.png)

![VS benchmark, 95%](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/aspcoredocker/vs-benchmark-95p-graph-win-vs-linux-1.png)

## Comparison with other technology stacks in Docker
While I can only compare "Hello World" scenario with other technology stacks I tried in the last days using Linux host and Docker containers, performance of ASP.NET Core seems disappointing: I think that the default Kestrel configuration (e.g. number of threads) is not optimal for Standard S1 machines. For example, these are the RPS mean values I saw for other technology stacks, tested with the same configuration:

| Technology stack | Hello World RPS |
|----------|-----------|
| Go 1.9.1 net/http | ~1000, with peaks of ~1100 |
| Python 3.6.1 uvloop, httptools | ~1000, with peaks of ~1200 |
| Python 3.6.1 Sanic, uvloop | ~600, with peaks of ~650 |
| PyPy 3, Gunicorn, Gevent, Flask | ~600, with peaks of ~650 |

This doesn't remove value from performance comparison between Windows hosted and Linux hosted ASP.NET Core application.

## Conclusions
Hosting applications using Linux and Docker in Azure Application Service Plan doesn't affect negatively the performance of the application, unlike one may guess, given that Windows hosting is more mature. It is actually beneficial, performance-wise, especially for requests returning responses with small bodies.
