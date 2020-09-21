# OpenShift 4 DevSecOps Workshop

---

## Design Goals

Several design goals were set in place before this started, and they have evolved somewhat as the work has gone on.

- Every role should be useful outside of the context of this workshop
- Every interaction with OpenShift should be done via the Kubernetes API, using the Ansible `k8s` module, except where it is impractical, to best support declarative configuration and enable fault tolerance and recovery from failures.
- Everywhere that an action is not natively idempotent (ex: `shell` module), effort should be made to make it idempotent and report appropriate status back to Ansible.
   (Any failures at all due to network conditions, timing problems, etc. should be 100% resolvable by running the exact same playbook without introducing new errors)
- Everything should be OpenShift 4.x native. This means preferring built-in functionality over third-party functionality, and it means using Operators as the primary deployment/management mechanism.
- There should be zero interaction required from the time you start to deploy the cluster to the time that the workshop is available for use. Anywhere that automation can make a decision about setting something up, it should have a variable available to change its behavior but assume a sane default.
- Readability is fundamentally important and any time that something is deemed to be too difficult to understand (large in-line Jinja or JMESPath, for example), it should be separated to be easier to understand.

## Quickstart Deployment

Here's what you need to get the workshop deployed quickly onto an RHPDS cluster.

### Prerequisites

- A Linux, Mac or Windows computer able to run `bash` shell scripts.
- An installed and configured container runtime (`docker` or `podman`) that your user has the privilege to execute within that `bash` shell.
- An RHPDS login to provision a cluster.

### Steps

**NOTE**: There is a folder named `cluster` created in the `vars` subdirectory referenced throughout these snippets. You can name it whatever you like and use it to isolate your cluster provisioning locally, just ensure that calls to `run-container.sh` use the name of that folder instead of `cluster` when the instructions say to call `./run-container.sh -c cluster`.

1. Clone this repository.

    ```shell
    git clone https://github.com/RedHatGov/devsecops-workshop-code.git
    cd devsecops-workshop-code
    ```

1. Copy the example variables to a new variable directory

   ```shell
   mkdir vars/cluster
   for varsfile in common devsecops; do cp vars/$varsfile.example.yml vars/cluster/$varsfile.yml; done
   ```

1. From the RHPDS interface, request an OpenShift 4.5 workshop and _**enable LetsEncrypt for the cluster**_.
1. Edit `vars/cluster/devsecops.yml` to change the following values:
   1. `reg_rhio_pull_token` should be set to your own service account token in accordance with the commented instructions there.
   1. The rest of the file is commented and those comments should be read if you decide you want to deviate from the default workshop deployment. Note that the lab guides expect the default deployment.
1. Wait for the email from RHPDS with your cluster GUID and login information.
1. Edit `vars/cluster/common.yml` to change the following values:
   1. `cluster_name` should be changed to the value after `api.` or `apps.` but before the next `.` in the domain name from the email. For example, given the API url `https://api.cluster-4b04.4b04.example.opentlc.com`, set `cluster_name: cluster-4b04`
   1. `openshift_base_domain` should be changed to the entire res of the `url` after `cluster_name`. For example, given the API url `https://api.cluster-4b04.4b04.example.opentlc.com` set `openshift_base_domain: 4b04.example.opentlc.com`
   1. Scroll down in `common.yml` until you see a section talking about customizing your deployment. You should edit `manual_users`, `workshop_admin`, and `number_of_users` to your desired configuration. The remaining settings are optional and you may choose to configure them if you wish.
1. Log in to your RPHDS cluster using `kubectl` or `oc` and the credentials provided in the RHPDS email.
1. Deploy everything using your staged answers and cached login:

   ```shell
   ./run-container.sh -c cluster -k ~/.kube/config devsecops
   ```

1. If Quay fails in some say, try rerunning the same command. If it still fails, completely uninstall and reinstall Quay and the operator by following [these short steps](#quay-problems). If anything else failed, try rerunning the same command. Sometimes for one reason or another there are timeout issues, but the deployment is fully idempotent. This is relatively rare now. In the event that the deployment fails on the same step (other than Quay) more than once, create an issue on GitHub and/or ping one of us on GChat.
1. Access your cluster at `console.apps.{{ cluster_name }}.{{ openshift_base_domain }}` - note that the Console route was shortened from the RHPDS default. Your students should sign in at `dashboard.apps.{{ cluster_name }}.{{ openshift_base_domain }}`.

## Other use cases

### Using your own OpenShift cluster

There's a playbook and associated vars file named `provision.yml` that expects to have exported AWS keys present in the environment (or will otherwise prompt you for them) in order to provision an OpenShift 4 cluster on AWS using IPI. It can additionally acquire LetsEncrypt certificates for you. To provision your own cluster, you mostly follow the same steps above with the following exceptions:

1. Instead of the RHPDS steps listed above, in `common.yml` set your `openshift_base_domain` to a Route53-managed domain name on your AWS account and set `cluster_name` to whatever you'd like to subdomain your cluster to underneath that base domain.
1. Also copy the `provision.example.yml` file to `vars/cluster/provision.yml`
1. Edit `vars/cluster/provision.yml` to specify the OpenShift version, AWS region for deployment, and add your pull secret.
1. When executing `run-container.sh` use a commandline like the following to chain both provision and workshop provisioning tasks:

   ```shell
   ./run-container.sh -c cluster provision devsecops
   ```

   Note that no kubeconfig is required here. The provisioning step automatically puts it where it needs to go.

### Development workflows

`run-container.sh` has been developed to use the Dockerfile present to run the playbooks and roles inside a RHEL 8 UBI container image. This means you can use run-container.sh to package a new container image on the fly with your changes to the repository, satisfying dependencies, and then map tmp and vars in to the container. In order to enable multiple clusters being run with multiple containers, `run-container.sh` requires a cluster name, and your variables should be structured into folders.

```shell
usage: run-container.sh [-h|--help] | [-v|--verbose] [(-e |--extra=)VARS] \
  (-c |--cluster=)CLUSTER [-k |--kubeconfig=)FILE] [-f|--force] \
  [[path/to/]PLAY[.yml]] [PLAY[.yml]]...
```

You should specify `-c CLUSTER` or `--cluster=CLUSTER` to define a container-managed cluster with a friendly name of CLUSTER. In this case, the container images will be tagged as `devsecops-CLUSTER:latest` and when executed, vars will be mapped in from `vars/CLUSTER/`, expecting to be their default names of `common.yml`, `devsecops.yml`, etc. as needed. If you have a local `~/.kube/config` that you have a cached login (for example, as `opentlc-mgr`), you should pass the path to that file with `-k ~/.kube/config` or `--kubeconfig=~/.kube/config`. `run-container.sh` will copy that file into the `tmp/` directory in the appropriate place for your cluster. Because `run-container.sh` stages the kubeconfig in this way, the cached logins from the playbooks will not back-propogate to your local `~/.kube/config`, so follow-on execution of `oc` or `kubectl` on your host system will not respect any changes executed in the container without using the kubeconfig in `tmp/` - which you can do by exporting the `KUBECONFIG` variable with the full path of that file. The `-f` or `--force` options are to force-overwrite a KUBECONFIG file from a previous run. If you reuse a cluster name across multiple RHPDS deployments, you will need this variable if you don't delete the `tmp` directories.

At this point, playbook execution should begin. Before attempting to work on a provisioned cluster, for example with the `devsecops` playbook, you may want to try running the `test` playbook to ensure you get good feedback from the framework. It will output some information that you may find useful for troubleshooting problems with the container or your authentication.

You can, of course, use the cluster name command line option to define multiple clusters, each with vars in their own subfolders, and execute any playbook from the project in the container. This means you could maintain vars folders for multiple clusters that you provision on the fly and provision or destroy them, as well as deploying the devsecops content on them, independently. They will continue to maintain kubeconfigs in their `tmp` subdirectory, and will all map the `common.yml`, `provision.yml`, and `devsecops.yml`, dynamically into their `vars` folder inside of the container at runtime. Container images will only be rebuilt when the cache expires or a change has been made, so you can continue to make edits and tweaks on the fly while running this workflow.

Do note that the containers run, in a `podman` environment, as your user - without relabelling or remapping them - but on a `docker` environment they are running fully priveleged. This is more privilege than containers normally get in either environment. This is to ensure that the repository files are mappable and editable by the container process as it executes, without having to tinker with UIDMAP or permissions to support this.

Additionally, you can do any portion of the following the following to skip having to specify these variables or be prompted for them:

```shell
export DEVSECOPS_CLUSTER=personal                                                # The cluster name for vars directory and container image name
export AWS_ACCESS_KEY_ID=<YOUR ACTUAL AWS_ACCESS_KEY_ID>                         # Your actual AWS_ACCESS_KEY_ID, which you would otherwise be prompted for if provisioning/destroying a cluster
export AWS_SECRET_ACCESS_KEY=<YOUR ACTUAL AWS_SECRET_ACCESS_KEY>                 # Your actual AWS_SECRET_ACCESS_KEY, which you would otherwise be prompted for if provisioning/destroying a cluster
./run-container.sh provision devsecops
#                    ^---------^----these are just playbook names, present in playbooks/*.yml
```

### Access the workshop services if you deployed the cluster from this repo

1. Access the cluster via cli or web console. If this repo deployed your cluster, the `oc` client is downloaded into `tmp`, in a directory named after the cluster, and `prep.sh` can put that into your path. The web console should be available at `https://console.apps.{{ cluster_name }}.{{ openshift_base_domain }}` (if you left the adjust_console variable alone). If you have recently deployed a cluster, you can update kubeconfig paths and $PATH for running the downloaded binaries with the following:

   ```shell
   . prep.sh
   ```

   prep.sh is aware of multiple clusters and will let you add to PATH and KUBECONFIG on a per-cluster basis in multiple terminals if you would like.
1. If you deployed the cluster with this repo, when you are ready to tear the cluster down, run the following commands from the project root:

   ```shell
   . prep.sh
   ./run-container.sh -c CLUSTER destroy
   ```

## Structure Overview

There are three major playbooks implemented currently:

- `playbooks/provision.yml`
- `playbooks/devescops.yml`
- `playbooks/destroy.yml`

Additionally, there are three important vars files currently:

- `vars/CLUSTER/provision.yml`
- `vars/CLUSTER/devsecops.yml`
- `vars/CLUSTER/common.yml`

There are a significant number of roles that are part of building the cluster and workshop content. You should explore individual roles on your own, or look at how the playbooks use them to understand their operation. The intent of this repo is that the roles will be capable of being developed/maintained independently, and they may at some point be split into separate repositories with role depdendency, git submodules, Ansible Galaxy collection installation, or some combination of the above used to install them.

### Playbooks

---

#### playbooks/provision.yml

This playbook will, given access to AWS keys for an administrator account on which Route53 is managing DNS, provision an OpenShift 4.x cluster using the latest installer for the specified major.minor release. Additionally, it will generate and apply LetsEncrypt certificates for both the API endpoint and the default certificate for the OpenShift Router.

#### playbooks/devescops.yml

This playbook will deploy all of the services to be used in the workshop. First it adjusts the cluster to be ready to accept workshop content by doing the following:

- Create htpasswd-backed users based on the vars provided
- Delete the kubeadmin default user, if present
- Enable Machine and Cluster Autoscalers to allow the cluster to remain as small as possible (two 2xlarge instances as workers by default) until a load requires more nodes to be provisioned.
- Change the console route to `console.apps.{{ cluster_name }}.{{ openshift_base_domain }}` because `console-openshift-console.apps` is _just a bit much_.

As a rule, it uses Operators for the provisioning/management of all services. Where an appropriate Operator was available in the default catalog sources, those were used. Where one doesn't exist, they were sourced from Red Hat GPTE published content - or forked from that content and maintained by us at the GitHub RedHatGov project. Also as a rule, it tries to stand up only one of each service and provision users on each service. The roles have all been designed such that they attempt to deploy sane defaults in the absence of custom variables, but there should be enough configuration available through templated variables that the roles are valuable outside of the scope of this workshop.

#### playbooks/destroy.yml

This playbook will, provided a common.yml, identify if openshift-install was run from this host and confirm you would like to remove this cluster. It will completely tear the cluster down, and remove everything from the temporary directory for this cluster.

### Variable Files

---

#### vars/CLUSTER/common.yml

These variables include things that are important for both an RHPDS-deployed cluster and a cluster deployed from this project. They either define where the cluster is for connection, or they define how to deploy and later connect to the cluster. For clusters created with this project, it also indicates variables necessary to destroy the cluster.

#### vars/CLUSTER/provision.yml

The primary function of these variables is to provide information necessary to the `provision.yml` playbook for deploymen of the cluster.

#### vars/CLUSTER/devsecops.yml

This mostly contains switches to enable or disable workshop services and infrastructure. It's also where you configure the pull token for students to use a Service Account on the terms-based registry for JBoss images.

## Quay problems

Quay is sometimes flakey. I don't know what else to say about it. Sometimes it fails non-deterministically to deploy and emits very little troubleshooting information. Once it's up it generally behaves better, but getting it there is a little weird some times. You can take the following steps to completely uninstall Quay and the Quay Operator to try redeploying them:

   1. Open the console (note that the console route may have changed during deployment), sign in as an administrator, and navigate to _Operators_ -> _Installed Operators_.
   1. Change to the _quay-enterprise_ project.
   1. Click on the Red Hat Quay operator.
   1. Navigate to the QuayEcosystem tab of the operator page.
   1. Use the three-dots menu to the right of the QuayEcosystem named _quayecosystem_ and choose "Delete QuayEcosystem."
   1. Wait for the resources to be cleaned up - you can track the pods in _Workloads_ -> _Pods_ and the storage resources in _Storage_ -> _Persistent Volume Claims_.
   1. Head back to the _Installed Operators_ listing and click the three-dots menu to the right of the Red Hat Quay operator, choosing "Uninstall Operator."
   1. Head to _Home_ -> _Projects_ and scroll down to the _quay-enterprise` project. Click the three-dots menu to the right of it and choose "Delete Project."
   1. Wait for the project to disappear from the listing, then rerun the command that got you to a failed Quay. It will probably just work now!

## Contributing

We welcome pull requests and issues. Please, include as much information as possible (the git commit you deployed from, censored copies of your vars files, and any relevant logs) for issues and follow the overall design goals if making a pull request.
