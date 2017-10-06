---
layout: post
title: How to provision Azure resources using Azure CLI 2.0 and ARM templates, in Linux
---

This post describes how to deploy services in [Azure](https://azure.microsoft.com/en-us/), using [Azure CLI 2.0](https://docs.microsoft.com/en-us/cli/azure/overview?view=azure-cli-latest) and [Azure Resource Manager (ARM) templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates), in Linux. The same concepts apply for Windows, but with different commands to install Azure CLI, described anyway below.

It requires basic knowledge of Linux and an Azure account. If you don't have an Azure account, Microsoft offers a free 30-day trial period to all new account holders. It's sufficient to go to [https://azure.microsoft.com/en-us/free/](https://azure.microsoft.com/en-us/free/) and click the green "Start free" button. There are several guides on the internet on how to create a trial account for Azure, so I am not going to cover this topic.

Those who know Azure may wonder, why I a decided to write a post about something that is already documented in so many places. The first reason, is because I think the official [MSDN documentation](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) doesn't explain the simplest way to install the Azure CLI; which is also the most comfortable to install several versions of the application at the same time. The second reason is that I want to write other blog posts that require this kind of knowledge, and I want to give context for readers.

## Installing Azure CLI
Azure CLI 2.0 is implemented in Python and can be easily installed using its package manager, *pip*. It surprises me that this approach is not explained in the MSDN documentation, because Azure CLI is most useful for users of Linux and Mac OS X, systems where Python is usually pre installed by default; while Windows users generally use Powershell to interact with Azure.

The [GitHub repository of Azure CLI](https://github.com/Azure/azure-cli) describes this, at the voice ['edge builds'](https://github.com/Azure/azure-cli#edge-builds), but in a way that is only understandable for Python programmers. However, you don't really need to know Python, to follow along.

Assuming that you have Python 3 installed and [you can install it otherwise](https://www.python.org/downloads/), installing Azure CLI requires three simple commands:

#### 1. Create a Python virtual environment:
```bash
python3 -m venv env
```
This command means: _"Call Python 3, use its module 'venv' to create a virtual environment in a directory called 'env'"_. 

#### 2. Activate the environment
```bash
source env/bin/activate
```

#### 3. Install Azure-CLI
```bash
pip install azure-cli # for stable release
```
Or, if you want the edge release with all packages:
```bash
pip install --pre azure-cli --extra-index-url https://azurecliprod.blob.core.windows.net/edge
```

After this operation, you can run the console application and verify that it works by issuing the command `az --version`:
```bash
az --version
azure-cli (2.0.18)

{...} # versions of packages
storage (2.0.16)
vm (2.0.15)

Python location '/path/to/your/virtual/environment'
Extensions directory '/home/<username>/.azure/cliextensions'

Python (Linux) 3.5.3 (default, Jan 19 2017, 14:11:04) 
[GCC 6.3.0 20170118]

Legal docs and information: aka.ms/AzureCliLegal

```

Thanks to Python virtual environments, is extremely simple to install several versions of Azure CLI, if needed.

_The same commands in Windows would be:_
```
py -3 -m venv env
.\env\Scripts\activate.bat
_same pip command to install azure-cli_
```
----

## Accessing your account
Once Azure CLI is installed, you can login into your Azure account, using `az login` command. It displays a message like the one below:

```bash
$ az login
To sign in, use a web browser to open the page https://aka.ms/devicelogin and enter the code ********** to authenticate.
```

Follow the instructions, navigating to `https://aka.ms/devicelogin` and inserting the given code. After regular login through browser, the console application will know the context of your account and display a list of your subscriptions. It takes a few seconds after login, as it is polling a service to find out whether login was successful.

#### Selecting a subscription
If you have multiple subscription, you can select the one you want to use, with the command: `az account set --subscription "<NAME_OF_THE_SUBSCRIPTION_YOU_WANT_TO_USE>"`.

You can see the current subscription using the command: `az account show`.

### List available locations
You can list the locations where services can be deployed, using the command: `az account list-locations`. This is interesting to find possible values of --location option, in following step.

```bash
$ az account list-locations
[
  {
    "displayName": "East Asia",
    "id": "/subscriptions/b0ebe72d-1027-4774-8a6b-d374dd6483fc/locations/eastasia",
    "latitude": "22.267",
    "longitude": "114.188",
    "name": "eastasia",
    "subscriptionId": null
  },
  {
    "displayName": "Southeast Asia",
    "id": "/subscriptions/b0ebe72d-1027-4774-8a6b-d374dd6483fc/locations/southeastasia",
    "latitude": "1.283",
    "longitude": "103.833",
    "name": "southeastasia",
    "subscriptionId": null
  },

```

### Creating a resource group
A _resource group_ in Azure is... a group of resources. It's a logical entity, and by itself it doesn't cost any money. You decide how you want to organize resources in groups. Resources are any service offered by Microsoft, functional to its cloud offerings, such as instances of databases, hosting environments for web applications, web applications, disk space, virtual networks, reserved IP addresses, virtual machines, et cetera.

Before doing anything interesting in Azure, it's generally necessary to create one of these logical containers. To create a resource group using Azure CLI, use the following command (choosing the location you desire):

```bash
az group create --name "NAME_OF_YOUR_CHOICE" --location "westeurope"
```

The output looks like the following:
```bash
$ az group create --name "demo-group" --location "westeurope"
{
  "id": "/subscriptions/<GUID>/resourceGroups/demo-group",
  "location": "westeurope",
  "managedBy": null,
  "name": "demo-group",
  "properties": {
    "provisioningState": "Succeeded"
  },
  "tags": null
}
```

If you go to [Azure Portal](https://portal.azure.com), you will see the resource group just created.

![https://gist.github.com/RobertoPrevato/9ff1fc2fe8acf15bbbe6094a836697f8/raw/ff733fd2d3b2fb4367a2264ae97d6215025ce705/azure-demo-resource-group.png](https://gist.github.com/RobertoPrevato/9ff1fc2fe8acf15bbbe6094a836697f8/raw/ff733fd2d3b2fb4367a2264ae97d6215025ce705/azure-demo-resource-group.png)

Similarly to resource groups, it's possible to provision many other services using the Azure CLI, using well documented commands. For example, here is the documentation that explains how to obtain storage accounts (for files, message queues, NoSQL tables and file shares): [https://docs.microsoft.com/en-us/azure/storage/common/storage-azure-cli](https://docs.microsoft.com/en-us/azure/storage/common/storage-azure-cli). 

However, the jewel is to use ARM templates.

## Deploying services using ARM templates
`Azure Resource Manager` is today's deployment model designed by Microsoft for Azure. It enables developers to provision services using JSON template files, which is more convenient than writing Powershell or Azure CLI bash scripts. There are many examples of such templates online, and there is an official GitHub repository with a collection of examples:

* [Azure Quickstart Templates - https://github.com/Azure/azure-quickstart-templates](https://github.com/Azure/azure-quickstart-templates)

As a simple example, consider this one, that shows how to provision a storage account:
[https://github.com/Azure/azure-quickstart-templates/blob/master/101-storage-account-create/azuredeploy.json](https://github.com/Azure/azure-quickstart-templates/blob/master/101-storage-account-create/azuredeploy.json)
```js
{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountType": {
      "type": "string",
      "defaultValue": "Standard_LRS",
      "allowedValues": [
        "Standard_LRS",
        "Standard_GRS",
        "Standard_ZRS",
        "Premium_LRS"
      ],
      "metadata": {
        "description": "Storage Account type"
      }
    }
  },
  "variables": {
    "storageAccountName": "[concat(uniquestring(resourceGroup().id), 'standardsa')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "[variables('storageAccountName')]",
      "apiVersion": "2016-01-01",
      "location": "[resourceGroup().location]",
      "sku": {
          "name": "[parameters('storageAccountType')]"
      },
      "kind": "Storage", 
      "properties": {
      }
    }
  ],
  "outputs": {
      "storageAccountName": {
          "type": "string",
          "value": "[variables('storageAccountName')]"
      }
  }
}
```

Note how the configuration file consists of four main sections:
* parameters
* variables
* resources
* outputs

Parameters enable to define input values, overridable while deploying resources. Variables are used to compose values using functions, following conventions of ARM templates. For example, to obtain a variable `c` from the concatenation of two input parameters `a` and `b`:

```bash
  "parameters": {
    "a": {
      "type": "string",
      "defaultValue": "Hello"
    },
    "b": {
      "type": "string",
      "defaultValue": "World"
    }
  },
  "variables": {
    "c": "[concat(parameters('a'), ' ', parameters('b'))]"
  }
```

Resources describe the configuration of desired services; outputs permits to obtain output parameters, from deployment. Such output may include connection strings to databases, or messaging queues.

Now maybe you are wondering, like I was: _"Then, how do I create ARM templates? By hand?"_. Essentially, yes. Azure portal has a feature to generate ARM templates from existing resources, deployed using its graphical interface, but in practice it's much easier to compose ARM templates starting from examples in the internet: it just requires patience and reading.

### Validating templates and deploying resources
While preparing new templates, it's normal to repeat several tests in the process. The command `az group deployment validate` validates the syntax of a template file. For example, to validate a template file called `arm.json`, using the resource group created previously:

```bash
$ az group deployment validate --resource-group demo-group --template-file arm.json
```

To actually deploy the resources described in `arm.json`:
```bash
$ az group deployment create --resource-group demo-group --template-file arm.json
```

The last beautiful thing I am going to mention here, is this: deployments are "incremental" by default. It means that redeploying to the same resource group doesn't cause the destruction and recreation of existing resources with matching name. It simply applies changes and add missing resources, which is extremely good.

I am going to refer to these things in my following blog posts, without feeling guilty for "giving for granted" things that are not obvious.

### Thanks
Thanks to my colleagues Marek Grabarz ([https://marekgrabarz.pl](https://marekgrabarz.pl)), and Janusz N., for teaching me so many things about Azure and ARM! My only touch here is to use Python, Azure CLI and Linux in my private time.

### Useful links
* [About virtual environments in Python](https://docs.python.org/3/library/venv.html)
* [az group deployment commands](https://docs.microsoft.com/en-us/cli/azure/group/deployment?view=azure-cli-latest)

