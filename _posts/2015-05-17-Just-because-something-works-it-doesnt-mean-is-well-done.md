---
layout: post
title: Just because something works, it doesn't mean that is well done
---

I read few times a book with a collection of Murphy's laws, and I don't remember if I read anything like this:

> “Just because something works, it doesn't mean that is well done.”

However, this is something I often thought at work.

Because often, when you tell somebody that something is done badly, this is the answer you get: 

> “But it works...”

Where “it works” means: “it does what is needed”.
Now, I consider this a fallacy, a logical mistake. Because the fact that something works to some extent, doesn't make it automatically well done; and saying that it works doesn't stand as an argument against the fact that is bad.
I can demonstrate my position with practical examples, all things that I saw for real at work or read on articles that are publicly available:

1. if you store decimal numbers using VARCHAR in a SQL database, as strings formatted in English culture, and you always need to parse them from string to numbers to do mathematical operations,
it may work, but it's far from being well done.
2. if you copy-paste your code on a regular basis, duplicating your code instead of writing reusable code that will be maintainable and save many hours and a lot of client money,
it may work, but it's a crap
3. if you work on a web application and you make all javascript variables global, polluting the document global namespace,
it may work, but it's not well done
4. if you use string concatenation to build your queries and you don't parameterize the queries,
your code may do what's required by the client, but it's not well done and [can cause millions of euros of damage](http://codecurmudgeon.com/wp/sql-injection-hall-of-shame/)

Of course, the exact same principle applies to all things in life, not only programming. Things may fail on a number of different levels. Something may be doing more than actually needed and work apparently fine; or doing something in a really inefficient way.

Take the coffee capsules for example: they work as a business and to move a lot of $$$, but they don't represent something well done. 
They are less sustainable for the environment: one ugly plastic capsule for each espresso, seriously? 
They are also less sustainable from the economical point of view: how much money does it cost a kg of coffee in grains, and how much a kg of coffee inside plastic capsules? 

They sell just because people are lazy by nature, and capsules save the time to deal with the coffee powder, but from a design point of view, they should be considered a failure. 
But things in the real world are very much different than the good theory they teach at school.

### Conclusions
There is a concrete difference between the conditions of being working and being well done. So, don't say that something “works” or “does what needed” to cover a bad design, or as an argument against critics.
