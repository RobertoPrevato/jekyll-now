---
layout: post
title: Always use the right tool for the job
---

[Ferdi Giardini](http://www.ferdigiardini.com/) is one of the best teachers I had during my university studies. He's both artist and designer, and he's famous in Italy for work of arts and objects he designed.
Among the things he told during his lessons, is this sentence:

> "Always use the right tool for the job you're doing. It's pointless to even try to do something, if you don't have the right tools to do it."

In that context he was speaking about tools to work wood, plastic and other materials, using hands, but these words are often in my head, even now that I am working as programmer.

For example, some months ago I found myself desiring to resolve this problem:

1. read an unknown, arbitrary JSON structure from a text file
2. sort alphabetically by property name this JSON structure
3. save back again the file, to store the sorted JSON

Since I am regularly using C# and the popular Newtonsoft Json.NET library at work, at first I resolved the problem using them.
Deserializing an arbitrary structure from JSON using Json.NET and C# is quite straighforward, and produces a dynamic object.

```cs
dynamic data = JsonConvert.DeserializeObject(json);
```

While deserializing is straighforward, sorting alphabetically the resulting dynamic object by property name and serialize it back to JSON, not so much! At that time, Json.NET offered a built-in feature to sort alphabetically JSON structures created from instances of well known classes; but nothing to sort arbitrary, unknown objects.

After some headache I managed to hook to a function in Json.NET, and to write a function to sort the output of JSON serialization alphabetically; but I don't even bother sharing the solution.

Simply because, C# proved to not be the right language to deal with arbitrary, unknown structures. At that time I knew that sorting properties using JavaScript would have been a piece of cake, but since I didn't know yet how to use NodeJs and file system operations with it, I didn't try with it.

Months later I started studying Python, desiring to learn something different. And with great delight, I found out that what I wanted to achieve, is only a single line of code in Python: it's a built in feature in CPython!


```python
newJson = json.dumps(data, sort_keys=True, indent=2, ensure_ascii=False)
```

### Conclusions
Most of time we deal with well known structures, and static languages are perfectly fine. For example: we know exactly what information need to be sent to display a grid view in a application, or what data need to be collected to place an order in an ecommerce, etc.
But when there is the need to deal with arbitrary, unknown structures, a dynamic language could be a better tool to do the job.
Don't underestimate the power of dynamically typed languages just because they give freedom (many programmers snob dynamically typed languages, for the simple reason that they don't enforce their ways, like static languages do).

> *Nauka nigdy nie idzie w las*
