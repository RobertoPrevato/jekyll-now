---
layout: post
title: The ipse dixit effect
---

For many centuries, in Europe, scholars used to say the latin words “ipse dixit”, that mean “he, himself, told it”, to end any debate and justify any of their subjective arguments, if the same arguments had been previously used by the ancient Greek philosopher Aristotle.

Because Aristotle was recognized with so high prestige, that it was a taboo to even try to criticize his writings. This was self-imposed limitation from the so called intellectual world.

Centuries have passed, but people still do the same in many situations, for example with corporations.
“Google has done it”, so it must be good (ipse dixit, mommy Google).
In corporations where Microsoft technologies are used, it's the same sort of chant.
“Microsoft has done it”, so it must be used (ipse dixit, mommy Microsoft).

I do respect the products and services of these corporations too, but I cannot stand the dogmatism that many people create around them.

### Why am I writing this, now? 
Because over the past two years I've been using AngularJs, I read many blog posts and questions about this framework, and quite often saw people supporting it with the argument: "It's done by Google", or defending aspects of it that they would probably otherwise blame.

Let me do a practical example to explain my point of view.
If a single developer had come up with the idea to do something like this, to find the parameters to pass to a function call:

```javascript
﻿var﻿ fn = function ($scope, $http) { }; //some user defined function
//use the function.toString method to find its parameter names as magic strings
var deps ﻿=﻿ fn.toString().match(/function\s*\(([^\)]*)\)/)[1].split(/\s?,\s?/); 
//deps --> ["$scope", "$http"]
```

And had asked other programmers for their opinions on StackOverflow, a lot of people would have just dumped this idea, etiquetting it as tricky and bizarre, underlying the fact that it breaks any JavaScript minification.

If somebody working for Google instead introduces this concept...
> “Wow! It is GENIAL!”. 

You will find people defending this idea with these weak arguments:

* Yes, it does break minification, but there is already a GruntJs task to resolve this problem.
* Yes, it does use magic strings, but JavaScript is so shitty that it doesn't offer anything better by itself.

If JavaScript was really so poor, it's unclear how Angular could be any better, since it is done in JavaScript. Few years ago people used to tell the same thing when comparing jQuery versus JavaScript.

As a side note, Angular offers an option to throw exception if you use this kind of notation, and they called it "strictdi": the name they chose suggests that it's a more rigorous way to work, compared to the the default (non-strict) behavior. (https://docs.angularjs.org/error/$injector/strictdi).

This is just an example, but try to read blogs and questions about Angular and you will find funny dynamics into play:

* a big proud about using this framework, which makes me think about the South Park episode with people proud of using hybrid cars: Smug Alert!
* people insulting other people, for the simple reason that they dared criticize the framework, and taking things a bit too personally
* when somebody explains how to use an Angular feature that is totally not self-explanatory, overcomplicated and based on subjective assumptions of its developers, many people write comments full of satisfaction: “It's great, I would never thought about it, but now it's so clear!”.
Which makes me wanna shout them: "No, it isn't! If it was clear, you would have figured it out alone, or you would have understood it reading the documentation.".
* people trying to do comparisons between jQuery and Angular, without taking into considerations the years and original objectives of jQuery
* ...or useless performance comparisons that do not take into account the programmers performance and productivity, but only some loop with DOM manipulation
* people defending things that make no sense, like the behavior of the ng-if, because "they are described in the documentation"; like if calling "dog" a cat or "black" the white would make sense, if described in some instructions

Conclusion
When taking into consideration the adoption of anything that is advertised with a powerful and appealing marketing campaign, beware of the ipse dixit principle. Often IT people advocate libraries / frameworks / solutions just because they were done by a big corporation.
