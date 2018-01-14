---
layout: post
title: Upgrading Azure Storage Python SDK to support asyncio
picture: https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/master/images/posts/azurestoragepython/banner.png
---

In the last months I had occasion to use [Azure Storage](https://azure.microsoft.com/en-us/services/storage/?v=16.50) as primary persistence layer for a document management system for [my employer, William Demant Holding](https://www.demant.com). For those who don't know it, Azure Storage is a cloud based storage service by Microsoft, comprised of several services:
* **Table Service** - NoSQL database
* **Blob Service** - binary files storage, with support for virtual folders
* **Queue Service** - simple, cost-effective messaging system for large volume systems
* **File Service** - distributed file system

Azure Storage is cost effective and really convenient to store files and tabular data that don't require complex queries, even in large quantities.

All these services include [REST APIs](https://docs.microsoft.com/en-us/rest/api/storageservices/azure-storage-services-rest-api-reference) that enable programmatic access and administration via HTTP/HTTPS. Even though these REST APIs can be used directly, Microsoft distributes several client SDKs to simplify the consumption of these services with some of the most popular programming languages.

* [Microsoft Azure Storage SDK for .NET](https://github.com/Azure/azure-storage-net)
* [Microsoft Azure Storage SDK for Python](https://github.com/Azure/azure-storage-python)
* [Microsoft Azure Storage SDK for Node.js](https://github.com/Azure/azure-storage-node)
* [Microsoft Azure Storage SDK for Java](https://github.com/Azure/azure-storage-java)
* [Microsoft Azure Storage SDK for PHP](https://github.com/Azure/azure-storage-php)
* [Microsoft Azure Storage SDK for C++](https://github.com/Azure/azure-storage-cpp)
* [Microsoft Azure Storage SDK for Ruby](https://github.com/Azure/azure-storage-ruby)
* [Microsoft Azure Storage SDK for iOS (preview)](https://github.com/Azure/azure-storage-ios)

These SDKs are necessary because certain operations are not trivial when trying to consume the APIs directly, for example the configuration of [authentication headers](https://docs.microsoft.com/en-us/rest/api/storageservices/authentication-for-the-azure-storage-services).

I mainly use .NET Framework and .NET Core at work, but when I code in my private time and for fun, I prefer to use Python. I am planning to use Azure Storage for my future private projects and I am also planning to use the newest versions of Python with latest features and performance improvements. Unfortunately for me and those who want to do the same, the official Python SDKs by Microsoft are designed to work across all Python versions (like described in [this discussion in GitHub](https://github.com/Azure/azure-sdk-for-python/issues/496)), thus sacrificing the coolest features that are only available in Python 3.

In the case of Azure Storage SDK, this translates into sacrificing support for asynchronous, non blocking web requests that could be implemented using the built-in [`asyncio`](https://docs.python.org/3/library/asyncio.html) infrastructure for event loops, available since version `3.5` of the programming language<sup>1</sup>.

To be more specific, the official Azure Storage SDK for Python uses [`requests`](http://docs.python-requests.org/en/master/) by Kenneth Reitz to make web requests, which is a wonderful library, but doesn't implement asynchronous calls.

Reimplementing a new SDK for Python from scratch would be a bad idea, because most of the logic available in the official repository is reusable. I decided to try to edit the source code of the official library, to integrate [`asyncio`](https://aiohttp.readthedocs.io/en/stable/glossary.html#term-asyncio) and [`aiohttp`, which is one implementation of HTTP Client/Server for asyncio](https://aiohttp.readthedocs.io/en/stable/), and see if this approach is feasible. The objective is to find the root function making web requests, replace it with an asynchronous implementation, then traverse back up the call stack to make all calling functions asynchronous, too. To do so effectively (and without losing your mind), it is necessary to debug the source code.

This post describes the steps to achieve this objective. Those who want to try the final result without reading through, can simply [clone my fork](https://github.com/RobertoPrevato/azure-storage-python.git) and use it.

## 1. Forking and cloning the original repository
Since the source code of the SDKs is public in GitHub, the [original repository](https://github.com/Azure/azure-storage-python) was simply forked and cloned locally. Thanks to Satya Nadella for driving Microsoft to embrace open source! I never liked .NET and MS products so much.

```bash
git clone https://github.com/Azure/azure-storage-python.git
```

## 2. Preparing the virtual environment
Like described in the README of the official repository, the source code of the Python SDK is organized in several packages. `azure-storage-common` is, as the name suggests, used by the other projects and contains common code. The picture below illustrates the folder structure of the repository; I decided to start from the Blob service<sup>2</sup>. 

![Repo folder structure](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/a2e03e16a2cab29f2b937a5e48db43aa8f8ac502/images/posts/azurestoragepython/repo-folder-structure.png)

cd into `azure-storage-blob` and create a virtual environment for Python 3.
```bash
cd azure-storage-blob

# Windows:
py -3 -m venv env

# Linux (example, of course depends on $PATH)
python3 -m venv env
```

Activate the environment
```bash
# Windows
env\Scripts\activate

# Linux
source env\bin\activate
```

We need to install the dependencies of `azure-storage-blob`, which are described in its `requirements.txt`:
```bash
pip install -r requirements.txt
```

Then we also install `azure-storage-common` in development mode.
Since we know we are going to need a few extra packages for `azure-storage-common`, we must edit its `install_requires` configuration inside `setup.py`, to include `aiohttp`, `aiodns`, `cchardet` (the last two are [recommended dependencies for aiohttp](http://aiohttp.readthedocs.io/en/v0.17.2/index.html)).

```python
    install_requires=[
                         'azure-common>=1.1.5',
                         'cryptography',
                         'python-dateutil',
                         'requests',
                         'aiohttp',  # <--
                         'aiodns',   # <--
                         'cchardet', # <--
```

Install `azure-storage-common` in development mode, from file system and using the relative path:
```
pip install -e ..\azure-storage-common
```

This last step is important because it enables debugging and editing the `azure-storage-common` package on the fly, while running code in other libraries that depend on it. Development mode is a great feature of Python package manager.

## 3. Debugging
My favorite IDE for Python is [PyCharm](https://www.jetbrains.com/pycharm/specials/pycharm/pycharm.html) by JetBrains and I use it to debug. 

![PyCharm](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/c8aef5e7316f3f3983d4127efcd12d26196acdb4/images/posts/azurestoragepython/pycharm-banner.png)

The original repository contains unit and integration tests, but since the objective is to investigate the source code, it is easier to simply add new tests. By the way, this is made easier by the fact that tests in the original repository are contained in a dedicated folder at the root of the repository.

Adding a new `tests` folder and a new `test_whatever_name.py` in it, with code below, enables debugging of Python SDK source code.

```python
import unittest
from azure.storage.blob import BlockBlobService


import logging
logging.basicConfig(format='%(asctime)s %(name)-20s %(levelname)-5s %(message)s', level=logging.INFO)


TEST_CONTAINER_PREFIX = 'container'

ACCOUNT_NAME = '<account name>'
ACCOUNT_KEY = '<account admin key>'


class TestContainers(unittest.TestCase):

    def setUp(self):
        self.bs = BlockBlobService(account_name=ACCOUNT_NAME,
                                   account_key=ACCOUNT_KEY)
        self.test_containers = []

    def test_list_containers(self):
        containers = self.bs.list_containers()

        for container in containers:
            print(container.name)

    def OFF_test_upload_blob(self):

        self.bs.create_blob_from_text("tests", "hello-world.txt", "Hello World")
```

### 3.1 Preparing a Storage Account
I ran my tests against a real instance of storage account, having a couple of containers and test files. Account name and one of its administrative keys are sufficient to execute the code above.
As a side note, I had problem using the Python SDK with the [Azure Storage Emulator](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator).

![Storage account](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/c8aef5e7316f3f3983d4127efcd12d26196acdb4/images/posts/azurestoragepython/storage-account.png)

### 3.2 Looking for the root function to change
Everything is setup to start debugging and investigating the original library. I started from the `list_containers` function.

```python
    def test_list_containers(self):
        containers = self.bs.list_containers()  # <-- put a break point here
```

_Stepping into..._

![Debugging 01](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/c8aef5e7316f3f3983d4127efcd12d26196acdb4/images/posts/azurestoragepython/debugging-01.png)

_Getting closer..._

![Debugging 02](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/c8aef5e7316f3f3983d4127efcd12d26196acdb4/images/posts/azurestoragepython/debugging-02.png)

_Bingo!_

![Debugging 03](https://raw.githubusercontent.com/RobertoPrevato/robertoprevato.github.io/c8aef5e7316f3f3983d4127efcd12d26196acdb4/images/posts/azurestoragepython/debugging-03.png)

The piece of code illustrated in the above picture is the first one to change, in order to integrate with `asyncio`. 

This piece of code is the one that delegates to `requests` library the duty of making a web request to Blob Service REST API:
```python
        # Send the request
        response = self.session.request(request.method,
                                        uri,
                                        params=request.query,
                                        headers=request.headers,
                                        data=request.body or None,
                                        timeout=self.timeout,
                                        proxies=self.proxies)
```

## 4. Editing the source code to use asyncio

Switching between `requests` and `aiohttp` is not _that complicated_, since both implement their own kind of HTTP client session having similar functions. We simply need to replace the session object with a session from `aiohttp` and adjust the input parameters accordingly.

The session object is set in a single place of the code, inside the `azure.storage.common.StorageClient` class, which was modified to use the `ClientSession` implementation from `aiohttp`.

```python
def get_aiohttp_session():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return aiohttp.ClientSession(loop=loop)

## Later...

        # TODO: eventually define an interface for "SessionProvider", to support alternative implementations
        request_session = connection_params.request_session or get_aiohttp_session()
```

Then, I edited the code calling the `request` method of the session to handle differences between the two libraries:

```python
        query_string = urllib.parse.urlencode(request.query)

        response = await self.session.request(request.method,
                                          uri,
                                          params=query_string,
                                          headers=request.headers,
                                          data=request.body,
                                          timeout=self.timeout,
                                         ) # proxies=self.proxies -- apparently aiohttp can have one proxy, not many (https://docs.aiohttp.org/en/stable/client_reference.html)
```

The method was apapted to use `async` and `await` syntax:

```python
    async def perform_request(self, request):
        '''
        Sends an HTTPRequest to Azure Storage and returns an HTTPResponse. If 
        the response code indicates an error, raise an HTTPError.    
```

Similarly, I traversed the callstack backward, adding `await` and `async` to all calling functions up to the root `list_containers` function of `azure.storage.blob.BlockBlobService` class.

The unit test code was prepared to run asynchronous methods, too:

```python
import asyncio
import unittest
from azure.storage.blob import BlockBlobService


import logging
logging.basicConfig(format='%(asctime)s %(name)-20s %(levelname)-5s %(message)s', level=logging.INFO)


TEST_CONTAINER_PREFIX = 'container'

ACCOUNT_NAME = '<account name>'
ACCOUNT_KEY = '<account admin key>'


class TestContainers(unittest.TestCase):

    def setUp(self):
        self.loop = asyncio.get_event_loop()
        self.bs = BlockBlobService(account_name=ACCOUNT_NAME,
                                   account_key=ACCOUNT_KEY)
        self.test_containers = []

    def test_list_containers_async(self):
        async def go():
            containers = await self.bs.list_containers()

            for container in containers:
                print(container.name)

        self.loop.run_until_complete(go())

    def test_upload_blob_async(self):
        async def go():
            await self.bs.create_blob_from_text("tests", "hello-world.txt", "Hello World")

        self.loop.run_until_complete(go())
```

This way, I rapidly edited three read functions to be asynchronous: `list_containers`, `get_blob_metadata`, `list_blobs`. Note that the only I/O bound operations in this library are those interacting with the REST APIs. Arguably, the most complex code in `azure-storage-common` is the one creating and handling `Shared Access Signatures`, and this is CPU bound, so we don't need to touch it.

To simplify the process, I cloned again the [original repository](https://github.com/Azure/azure-storage-python) in a second folder and prepared an environment for debugging, like described above. This way it's possible to debug the original, working, code while working on edited (and often broken) code.

---

I then modified two write functions: `set_blob_metadata`, `create_blob_from_text`. In this case there was a minor problem: Authentication header was invalid because `aiohttp` is adding extra headers before shooting the REST API, hence invalidating the signed token.

The solution was found simply, comparing the headers sent by original code using `requests` with the headers sent by `aiohttp`. A quick workaround is to make Azure library aware of these extra headers, before creating the signed access token.

```python
                    # NB: aiohttp adds extra headers that would break the authentication token
                    request.headers.update({
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate',
                        'Host': f'{self.account_name}.blob.core.windows.net',
                        'Content-Type': 'application/octet-stream'
                    })

                    self.authentication.sign_request(request)
```

Of course a better solution would be to disable these extra headers in `aiohttp`, but this workaround is sufficient for the time being.

**Eureka!** In a couple of hours I managed to integrate `asyncio` in five functions and it wasn't really hard. With a small effort, I could help Python community by completing an alternative Python SDK for Azure Storage, supporting asynchronous calls; and I am willing to do so. An fork in GitHub could be easily installed by others, simply cloning the repository and installing the dependency from file system, and it doesn't look impossible to maintain it. Azure Storage REST APIs are not going to change *that often*, hopefully.

I am willing to help Python community using Azure. **Join me, if you will!**

---

#### Notes
1. This is not to say that there aren't options to implement asynchronous web clients and servers in Python 2: some of them were implemented way before the original [Node.js presentation by Ryan Dahl](https://www.youtube.com/watch?v=ztspvPYybIY) (e.g Tornado, Twisted, Gevent), anyway none of them are completely cross platforms and work in both Python 2 and 3 - please correct me if I am wrong -.
2. Interestingly, the client for the Table Service was recently removed from this repository and merged to [CosmosDB SDK](https://github.com/Azure/azure-cosmosdb-python), because the two services [(Table Service and CosmosDB Table) share the same API](https://docs.microsoft.com/en-us/azure/cosmos-db/table-support). The choice in naming looks confusing to me, since CosmosDB and Azure Storage are two different services, and the client for Table Service in the Storage service is now published under the CosmosDB specific namespace.
