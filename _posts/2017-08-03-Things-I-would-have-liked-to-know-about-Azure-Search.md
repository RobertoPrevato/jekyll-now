---
layout: post
title: Things I would have liked to know about Azure Search
---

Since I changed work and joined the wonderful [William Demant](http://www.demant.com), I have occasion to use [Microsoft Azure](https://azure.microsoft.com/en-us/overview/what-is-azure) daily at work. Recently I worked on a web application for documents administration (PDF, Word, Excel, etc.), featuring files upload, download, administration of metadata, search of documents by metadata and contents. 

The application consists of following elements:
1. [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/tutorials/first-mvc-app/start-mvc) web application, hosted in an application service plan
2. Front end [SPA](https://en.wikipedia.org/wiki/Single-page_application), implemented using [React](https://facebook.github.io/react), with [ES6](http://es6-features.org) and [Babel](https://babeljs.io).
3. [Azure Storage](https://azure.microsoft.com/en-us/services/storage), to store application data in its [Table storage](https://azure.microsoft.com/en-us/services/storage/tables/), and files in its [Blob storage](https://azure.microsoft.com/en-us/services/storage/blobs)
4. [Azure Search](https://azure.microsoft.com/en-us/services/search) service, to index documents and offer full-text search feature
5. [Application Insights](https://azure.microsoft.com/en-us/services/application-insights) to collect application telemetries
6. Integration with [Azure Active Directory (AAD)](https://docs.microsoft.com/en-us/azure/active-directory/active-directory-whatis)

As part of our automated deployments, most of these resources are provisioned using [Azure Resource Manager (ARM) templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates).

I thought to share my experience with Azure Search, since a few things made me scratch my head for a while.

## Basics of Azure Search
To use an Azure Search service, three kinds of components can be configured:

* **Index**: holds the configuration of which properties must be indexed, how they must be indexed, scoring profiles, allowed origins for [HTTP access control (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS), and keeps indexed entries. It can be used alone, if populated programmatically.
* **Data Source**: the source of data that needs to be indexed. For example, it can be a SQL table, a Table Storage, a Blob Storage.
* **Indexer**: is what creates index entries, reading from a data source. It is associated with a single data source and a single index, and holds configuration of failure handling, scheduling, fields mapping and eventual transformations from source data to indexed values (an example is described below). 

In our setup, an index is populated by an indexer, which reads from the Blob storage, indexing files metadata and contents, like described in this article: [https://docs.microsoft.com/en-us/azure/search/search-howto-indexing-azure-blob-storage](https://docs.microsoft.com/en-us/azure/search/search-howto-indexing-azure-blob-storage).

Azure Search is a great service, but here I focus mainly on the things I didn't like, and that required more time than I was expecting.

### Limited ARM support
Azure Search Indexer, Index and Data Source cannot be configured using ARM templates.
Only Azure Search service itself can be configured in ARM templates, as such, required components need to be configured using the Azure Search REST api. Stating the obvious, had it been possible though ARM templates, it would have taken a much smaller amount of time - but that's how it is.
As things stand at present, only the smallest part of Azure Search configuration can be handled through ARM templates. For continuous delivery and automated deployments, I wrote PowerShell scripts to do web requests to the REST api.

Useful links:
* [Azure Search With Powershell, by Rasmus Tolstrup Christensen](http://rasmustc.com/blog/Azure-Search-With-Powershell/)
* [Create index](https://docs.microsoft.com/en-us/rest/api/searchservice/create-index)
* [Create data source](https://docs.microsoft.com/en-us/rest/api/searchservice/create-data-source)
* [Create indexer](https://docs.microsoft.com/en-us/rest/api/searchservice/create-indexer)

### Another small disappointment about ARM support...
In our solution, the Azure Search index is queried through GET requests directly from clients: CORS have been configured to allow requests from specific HTTP origins. In this kind of setup, a so called Query Key is used to authorize the use of search service from clients. Azure Search Query Key is stored in web application configuration and served to clients, so they can make direct web requests to Search Service. When provisioned, a new Azure Search Service comes with two administrative keys and a single query key. Also in this case, ARM templates don't help, since Query Keys cannot be returned as output parameters; while it is possible to return administrative keys.

Since Azure Search Query Key cannot be returned as output parameter of ARM template, a solution is to use the _Microsoft.Search/searchServices/createQueryKey_ command through PowerShell to generate a query key, then put it in the application configuration.

```ps
  $queryKey = (Invoke-AzureRmResourceAction `
    -ResourceType "Microsoft.Search/searchServices/createQueryKey" `
    -ResourceGroupName $resourceGroupName `
    -ResourceName $serviceName `
    -ApiVersion 2015-08-19 `
    -Action $description `
    -Force `
    -Confirm:$false).Key
```

As a side note, and to point out the asymmetry, an Azure Search administrative key can be obtained in ARM templates using this function:

```
[listAdminKeys(variables('searchServiceFullName'), '2015-08-19').PrimaryKey]
```

### Non-standard handling of Base64 URL encoded strings
When indexing files metadata in Blob storage, and desiring to support non-ASCII characters (who doesn't!?), it's necessary to use URL safe Base64 encoded strings, and configure the indexer fields mappings to use “base64decode” function, like described here:
* [https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.search.models.fieldmappingfunction.base64decode?view=azuresearch-3.0.4](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.search.models.fieldmappingfunction.base64decode?view=azuresearch-3.0.4)
* [https://docs.microsoft.com/en-us/azure/search/search-indexer-field-mappings](https://docs.microsoft.com/en-us/azure/search/search-indexer-field-mappings)

What the documentation doesn't mention, though, is that Azure Search indexer is breaking if one uses _standard_ Base64 URL safe strings, it only works with _non-standard_ strings that were returned classically by **System.Web.HttpServerUtility.UrlTokenEncode** method. Such strings are non-standard in this way, as their trailing padding characters '=' are replaced with a digit indicating the number of = signs that were removed. By the standard, these trailing padding characters are optional and can be omitted when encoding.

For example: 
* standard of “Hello World” is “SGVsbG8gV29ybGQ=”, but this method returns: “SGVsbG8gV29ybGQ**1**”
* standard for “Lorem Ipsu” is “TG9yZW0gSXBzdQ==”, but this method returns: “TG9yZW0gSXBzdQ**2**”

When using standard strings (with or without optional padding characters), indexing breaks with this error message: _"Error applying mapping function 'base64Decode' to field 'NAME': Array cannot be null.\r\nParameter name: bytes"_. The Azure Search Indexer works only when using these non-standard strings. This is clearly a bug: either in documentation not mentioning the caveat, or in Azure Search base64decode function. In my opinion, Azure Search base64decode method should be fixed to support standard strings (with or without padding characters).
 
I found this problem because of common scenarios:
* I was using shared access signature and JavaScript web requests to edit blob metadata, with [standard encoding](https://developer.mozilla.org/en/docs/Web/API/WindowBase64/Base64_encoding_and_decoding)
* I was using Python to bulk-upload test data, using its [_base64.urlsafe_b64encode_](https://docs.python.org/3/library/base64.html)

In both cases, I needed to write wrapper functions that return non-standard strings.
This last thing made me waste half day of work, hopefully I will help somebody to save time with this post.

### Following soon...

In my next blog post I will speak about how I bulk-uploaded test data inside development environments, using [Python Azure Storage library](https://github.com/Azure/azure-storage-python); and how to bulk-upload files to Blob storage using the new [asyncio framework](https://docs.python.org/3/library/asyncio.html) of Python 3.4 >.

Cheers!