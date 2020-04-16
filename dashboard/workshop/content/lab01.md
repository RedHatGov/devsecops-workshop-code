This lab provides a quick tour of the console to help you get familiar with the user interface along with some key terminology we will use in subsequent lab content.

# Key Terms
We will be using the following terms throughout the workshop labs so here are some basic definitions you should be familiar with. You'll learn more terms along the way, but these are the basics to get you started.

* Container - Your software wrapped in a complete filesystem containing everything it needs to run
* Image - We are talking about docker images; read-only and used to create containers
* Pod - One or more docker containers that run together
* Service - Provides a common DNS name to access a pod (or replicated set of pods)
* Project - A project is a group of services that are related logically
* Deployment - an update to your application triggered by a image change or config change
* Build - The process of turning your source code into a runnable image
* BuildConfig - configuration data that determines how to manage your build
* Route - a labeled and DNS mapped network path to a service from outside OpenShift
* Master - The foreman of the OpenShift architecture; the master schedules operations, watches for problems, and orchestrates everything
* Node - Where the compute happens; your software is run on nodes
* Pipeline - Automates the control, building, deploying, and promoting your applications on OpenShift

# Accessing OpenShift
OpenShift provides a web console that allows you to perform various tasks via a web browser.  Additionally, you can utilize a command line tool to perform tasks.  Let's get started by logging into both of these and checking the status of the platform.

## Let's Login to the Web Console

<img src="images/ocp-login.png" width="600"><br/>

Open the Console tab in your dashboard, and you should see your available projects - or a button to create a project if none exist already.

## Let's try the 'oc' command line (CLI) tool
Check to see what projects you have access to:

```execute
oc get projects

```

Type the following command to show services, deployment configs, build configurations, and active deployments (this will come in handy later):

```execute
oc status

```

# Summary
You should now be ready to get hands-on with our workshop labs.
