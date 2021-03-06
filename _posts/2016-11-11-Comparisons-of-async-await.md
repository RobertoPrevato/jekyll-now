---
layout: post
title: Comparison of async await syntax in .NET, Python and JavaScript
---

While I am planning to write a review of aiohttp, an event-driven HTTP client/server implementation for Python, I decided to write something about asynchronous programming and the async/await syntax in .NET, Python and JavaScript.

Python has a long history of asynchronous programming for web servers using event loops, with the first release of [twisted](https://en.wikipedia.org/wiki/Twisted_(software)) framework dating back to 2002, and other implementations such as [gevent](http://www.gevent.org/) and [Tornado](http://www.tornadoweb.org/en/stable/), so one may be wondering why a new implementation was needed at all.

The most notable difference between aiohttp and other existing implementations, is that aiohttp is using the latest Python built-in features for concurrency. [Guido van Rossum](https://en.wikipedia.org/wiki/Guido_van_Rossum) himself worked on the implementation of a built-in event loop for Python, initially called [project "Tulip"](https://www.youtube.com/watch?v=aurOB4qYuFM), then asyncio, to add async support in Python.

This introduces the discussion about *async await* syntax in Python, which was [recently introduced](https://www.python.org/dev/peps/pep-0492/) in the version 3.5 of the language, as a more convenient replacement of the previous *@asyncio.coroutine* and *yield from* syntax.
The same syntax exists in .NET framework since 2012, and is being implemented in EcmaScript 7, to offer a user friendlier alternative to callbacks.

## A tiny bit of history
When [NodeJs](https://nodejs.org/en/) gained popularity and attracted general attention from the IT world, revolutionizing how IT people looked at JavaScript, it also contributed to draw more attention to asynchronous, non-blocking patterns in server side web development. During the [original presentation of NodeJS by Ryan Dahl](https://www.youtube.com/watch?v=ztspvPYybIY), one of the points Dahl insisted more about, is the fact that a single threaded event-based engine, like the JavaScript engine, is ideal to perform I/O intensive operations: the kind of operations a web server does when handling web requests. Dahl demonstrated that a web server implemented using the Google Chrome JavaScript engine was able to handle a huge number of concurrent web requests, much more than a traditional web server using a thread pool to handle web requests, since threads are expensive and cannot be generated in great number. As mentioned above, the concept of an event loop to answer web requests was not new, but NodeJs can boast an excellent communication and marketing strategy, which contributed to its popularity and to draw more attention to asynchronous patterns.

I think it's not a coincidence that NodeJs was first released in 2009, Microsoft released the Tasks namespace and async/await syntax in 2012; and Guido van Rossum started working on a built-in implementation of event-loop for Python.

### Does it mean that a web server using an event loop is always better than a web server using a threads pool?
Absolutely not, it depends on the operations the web server needs to perform. For example, when creating a web service that accepts pictures and videos upload to perform pictures and video manipulation (CPU intensive work), it can be expected to obtain better performance from a thread based web server. A single threaded, event-loop web server would hang while performing file manipulation, unable to answer to other incoming requests. Conversely, when developing a server that receives a great amount of concurrent requests that are performing I/O bound operations (e.g. reading from file system, reading from database), better performance can be expected from a web server using an event loop and lighter alternatives to threads.

## Explanation by misconceptions
Some misconceptions that in the past caused confusion in myself, were to think that:

* asynchronicity can be obtained only using an event loop
* asynchronicity produces the same good results, regardless of the type of its implementation
* coroutines and callbacks used within an event loop are the same thing

In practice, having an event loop for asynchronicity is just an implementation detail: asynchronicity can be implemented in different ways and the type of implementation brings consequences. In other words, *"asynchronous"* does not imply an event loop. The .NET framework, with its Tasks namespace and async/await, implements asynchronicity using threads and a thread pool. This makes it fit for CPU intensive work or to implement responsive interfaces for mobile/desktop applications, rather than I/O intensive operations that happen in great number. Python 3.5 async/await syntax, while being conceptually identical to C# async/await, works in a completely different way: under its hood is using an event loop and coroutines, making it ideal for web servers implementations and I/O work.

Although coroutines and callbacks allow to obtain the same results, they are very different in practice. JavaScript historically adopted the callbacks pattern to implement asynchronous code; Python's designers decided to adopt the coroutines pattern, considered to be more readable and more convenient to write. Arguably they are right and this opinion is now shared by the JavaScript/EcmaScript designers, since they are implementing the [async/await syntax for EcmaScript 7](https://ponyfoo.com/articles/understanding-javascript-async-await).

Example of callback pattern in JavaScript (NodeJs):

```javascript
// asynchronous code implemented using callbacks (using lambda syntax)
var fs = require("fs");    // require the module that offers function for file system operations


var fileName = "myfile.foo";

// NB: code execution does not hang, waiting for the "fs.exists" answer; it immediately goes on to
// console.log function call. The callback passed as function argument is executed later by the inner code, when the answer to 'exists' is ready

fs.exists(fileName, (exists) => {
  if (exists) {
    // open, do something...
    fs.open(fileName, "r", (err, fd) => {
    
    });
  } else {
    console.error("myfile.foo does not exist");
  }
});

console.log("Hello World");
```

Callbacks are passed as function arguments, knowing that they will be executed *somewhere* during code execution.

Example of coroutines pattern in Python using async await syntax, [using an example from official aiohttp documentation](http://aiohttp.readthedocs.io/en/stable/):

```python
import aiohttp
import asyncio
import async_timeout


# async and await keywords are explicit instructions to let know 
# when code execution can continue (when the event loop should take care of other portions of the code)
# code execution restarts after the "await" keyword when its awaited operation completes

async def fetch(session, url):
    with async_timeout.timeout(10):
        async with session.get(url) as response:
            return await response.text()

async def main(loop):
    async with aiohttp.ClientSession(loop=loop) as session:
        html = await fetch(session, 'http://python.org')
        print(html)

loop = asyncio.get_event_loop()
loop.run_until_complete(main(loop))
```

Like written in the comments above, *async* and *await* keywords are explicit instructions to specify when code execution can continue somewhere else; in other words when the event loop can dedicate itself to other portions of the code. When an awaited operation completes, code execution restarts from the await statement. This happens transparently for the programmer, handled by the implementation of the event loop.
In both situations (callbacks or coroutines), the event loop is responsible of firing the right callback, or restart code execution at the right 'await' point, when necessary. I agree that coroutines pattern is more convenient and more readable than the callbacks pattern. Python community is particularly sensitive and cultured when it comes to code readability, so this is not surprising.

Note how the C# async / await syntax is similar:

```cs
// we know that the function will take time to execute and can be made asynchronous,
// so we decorate it with "async" and wrap its return type in Task<A>
public async Task<int> DoSomethingThatTakesTimeAndReturnInteger()  
{  
    string fileContent = await ReadFromFile(@"C:\Some\File\Location\foo.txt");
    
    return Int32.Parse(fileContent);
}

// the following function has no return value, but calls another asynchronous
// function, so the Task return type is used instead of "void"
public async Task SomeFunctionWithoutReturnValue()
{
    int id = await DoSomethingThatTakesTimeAndReturnInteger();
    
    System.Diagnostics.Debug.WriteLine("The id is: " + id.ToString());
}

```

As described above, despite the similarity in syntax and perceived behavior of C# and Python async await, their implementations work in a completely different way and are suitable for different scenarios.

Small wonder, the async await in EcmaScript 7 will look like in C# and Python, and internally works in a similar way to Python's implementation, since they both use an event loop:

```javascript

// javascript example for async await syntax

async function read () {
  var html = await getPageFromWikipedia();
  
  // do something useful
  console.log(html);
}

```

## A curiosity for .NET programmers
Something that not many .NET developers know about, while non-beginner Python developers *should* know, is that it is possible to implement coroutines using the *IEnumerable* and *yield return* syntax. *yield return* does something similar to *await*: it is an explicit instruction to let know when code execution should be stopped inside a function and continue somewhere else. This opens up for potentially creative uses of the syntax.

For example:

```cs

public IEnumerable<int> GetIterable()
{
    //
    // NB: code execution doesn't get here when executing:
    //   GetIterable();
    // it gets here when entering the foreach loop!
    //
    yield return 1;

    // this piece of code is executed while looping for the second time on the iterable.
    System.Diagnostics.Debug.WriteLine("... 2");
        
    yield return 2;

    // this piece of code is executed while looping for the third time on the iterable. (and so on...)
    System.Diagnostics.Debug.WriteLine("... 3");

    yield return 3;

    System.Diagnostics.Debug.WriteLine("... 4");

    yield return 4;

    System.Diagnostics.Debug.WriteLine("... 5");

    yield return 5;

    System.Diagnostics.Debug.WriteLine("End of the iterable!!");
}


public static void Main(params string[] args) 
{
    // NB: code execution does not get inside the `GetIterable` function!!
    var iterable = GetIterable();

    // code execution gets inside the "GetIterable" function only when the foreach loop starts
    foreach (int i in iterable) 
    {
        // in the first loop; i is 1 (the first returned value)
        // the "... 2" output to debug console appears only afte the end of the first iteration, and so on.
        // it works like a coroutine on the single thread which is executing this code.
    }
}


```

I expect Python developers to know more than .NET developers on this detail, because:

* Python features a similar *yield* syntax and was actively used in creative ways (not only to save RAM while iterating over big objects!)
* *yield from* has been used to implement coroutines and async support in Python
* Python *await* now replaces the *yield from* syntax
* There is a popular, production ready implementation of discrete-event simulation library in Python, called SimPy, which is using this technique to implement coroutines

Interestingly, somebody created a discrete event simulation library in .NET inspired by SimPy, called [Dessert](https://github.com/pomma89/Dessert). It demonstrates the use of yield return syntax to implement coroutines in C#, F#, VB.NET and Boo programming language. This approach, if further investigated, could offer interesting results in .NET, like it did in Python.

## A curiosity for everyone
One of the best features of asyncio, is that it allows to use custom implementations of the event loop. [Yury Selivanov claims that](https://magic.io/blog/uvloop-blazing-fast-python-networking/), when replacing asyncio built-in event loop with another implementation called [uvloop](https://github.com/MagicStack/uvloop), built upon [libuv](http://libuv.org/), it is possible to obtain a web server that is 2x faster than NodeJs, and competing with implementations created with [Go programming language](https://golang.org/).

---

## Conclusions, going back to aiohttp
I find fascinating how programming languages affect each other and evolve together. This is not surprising, since every product of technology takes inspiration from its competitors, but I think there is a lot of emotional sensitivity in the design of programming languages. Many choices are taken because of the *way of thinking* of their authors, rather than technical limitations. This makes the design of programming languages an expression of art and creativity, more than many other products of technology.

aiohttp is one of the main characters taking part in an epic battle between Python and other programming languages, to be more competitive in the field of asynchronous programming. One of the most notable features of Python, being "batteries included", which means rich in built-in features, represents its biggest limitation in this field, since most of the existing code is synchronous. For this reason, the developers of asynchronous code in Python community have today a great responsibility.

Preview: I published a [project template for aiohttp web applications using three tier architecture in GitHub](https://github.com/RobertoPrevato/aiohttp-three-template).
Soon a review of aiohttp will be following!
