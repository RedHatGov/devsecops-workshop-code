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

## Operation

This should work even on a Mac! You need a container runtime (either Docker or Podman) installed on your machine and... that's pretty much it.

`run-container.sh` has been developed to use the Dockerfile present to run the playbooks and roles inside a RHEL 8 UBI container image. This means you can use run-container.sh to package a new container image on the fly with your changes to the repository, satisfying dependencies, and then map tmp and vars in to the container. In order to enable multiple clusters being run with multiple containers, `run-container.sh` requires a cluster name, and your variables should be structured into folders.

```shell
usage: run-container.sh [-h|--help] | [-v|--verbose] [(-e |--extra=)VARS] \
  (-c |--cluster=)CLUSTER [-k |--kubeconfig=)FILE] [-f|--force] \
  [[path/to/]PLAY[.yml]] [PLAY[.yml]]...
```

You should specify `-c CLUSTER` or `--cluster=CLUSTER` to define a container-managed cluster with a friendly name of CLUSTER. In this case, the container images will be tagged as `devsecops-CLUSTER:latest` and when executed, vars will be mapped in from `vars/CLUSTER/`, expecting to be their default names of `common.yml`, `devsecops.yml`, etc. as needed. In this configuration, if you have a local `~/.kube/config` that you have a cached login (for example, as `opentlc-mgr`, you should pass the path to that file with `-k ~/.kube/config` or `--kubeconfig=~/.kube/config`. `run-container.sh` will copy that file into the `tmp/` directory in the appropriate place for your cluster, and `kubeconfig` should _**not be changed**_ from the DEFAULT of `{{ tmp_dir }}/auth/kubeconfig` in `vars/CLUSTER/common.yml`. Because `run-container.sh` stages the kubeconfig in this way, the cached logins from the playbooks will not back-propogate to your local `~/.kube/config`, so follow-on execution of `oc` or `kubectl` on your host system will not respect any changes executed in the container without using the kubeconfig in `tmp/`.

For example, let's suppose you wanted to use the friendly name `rhpds` for a cluster. You create a directory in `vars/` named `rhpds` and copy the necessary examples into it, while renaming them.

```shell
mkdir -p vars/rhpds
cp vars/common.example.yml vars/rhpds/common.yml
cp vars/devsecops.example.yml vars/rhpds/devsecops.yml
```

Then edit `vars/rhpds/common.yml` so that cluster_name and openshift_base_domain match the email you got from RHPDS. **You should not change kubeconfig in common.yml to the location of your own kubeconfig.**

You can edit the rest of `common.yml` and `devsecops.yml` to suit your needs, in their normally documented fashion, for playbook execution inside the container.

If you have not already, log in to your cluster locally before executing the script. To do that, and then build and execute the container image, you can run:

```shell
oc login -u opentlc-mgr -p <PASSWORD_FROM_EMAIL> <cluster_name>.<openshift_base_domain>         # Make sure you use the values from your email from RHPDS, not these placeholders
oc whoami                                                                                       # You should see `opentlc-mgr` here
./run-container.sh -c rhpds -k ~/.kube/config devsecops                                         # ~/.kube/config is the default location for the kubeconfig for kubectl and oc, replace if yours is different
#                   ^        ^                ^-- this is the name of the playbook you want to execute. It should be in playbooks/devsecops.yml in this case
#                   |        \---- This is telling run-container.sh to copy the kubeconfig from this location into tmp before running the container image
#                   \--- this flag lets run-container.sh know what subfolder your vars are in, and what to name the container image
```

At this point, playbook execution should begin. Before attempting to work on a cluster, you may want to try running the `test` playbook to ensure you get good feedback from the framework.

You can, of course, use the cluster name command line option to define multiple clusters, each with vars in their own subfolders, and execute any playbook from the project in the container. This means you could maintain vars folders for multiple clusters that you provision on the fly and provision or destroy them, as well as deploying the devsecops content on them, independently. They will continue to maintain kubeconfigs in their `tmp` subdirectory, and will all map the `common.yml`, `provision.yml`, and `devsecops.yml`, dynamically into their `vars` folder inside of the container at runtime. Container images will only be rebuilt when the cache expires or a change has been made, so you can continue to make edits and tweaks on the fly while running this workflow.

Do note that the containers run, in a `podman` environment, as your user - without relabelling or remapping them - but on a `docker` environment they are running fully priveleged. This is more privilege than containers normally get in either environment. This is to ensure that the repository files are mappable and editable by the container process as it executes.

Additionally, if you would like to work on just one cluster using the container workflow, you can do any portion of the following the following to skip having to specify these variables or be prompted for them:

```shell
export DEVSECOPS_CLUSTER=personal                                                # The cluster name for vars directory and container image name
export AWS_ACCESS_KEY_ID=<YOUR ACTUAL AWS_ACCESS_KEY_ID>                         # Your actual AWS_ACCESS_KEY_ID, which you would otherwise be prompted for if provisioning/destroying a cluster
export AWS_SECRET_ACCESS_KEY=<YOUR ACTUAL AWS_SECRET_ACCESS_KEY>                 # Your actual AWS_SECRET_ACCESS_KEY, which you would otherwise be prompted for if provisioning/destroying a cluster
./run-container.sh provision devsecops
#                    ^---------^----these are just playbook names, present in playbooks/*.yml
```

### Access the workshop services if you deployed the cluster from this repo

1. Access the cluster via cli or web console. If this repo deployed your cluster, the `oc` client is downloaded into `tmp`, in a directory named after the cluster, and `prep.sh` can put that into your path. The web console should be available at `https://console.apps.{{ cluster_name }}.{{ openshift_base_domain }}` (if you left the adjust_console variable alone). If you have recently deployed a cluster, you can update kubeconfig paths and $PATH for running binaries with the following:

   ```shell
   . prep.sh
   ```

   prep.sh is aware of multiple clusters and will let you add to PATH and KUBECONFIG on a per-cluster basis in multiple terminals if you would like.
1. If you deployed the cluster with this repo, when you are ready to tear the cluster down, run the following commands from the project root:

   ```shell
   . prep.sh
   ./run-container.sh -c CLUSTER destroy
   ```

## Basic Structure

There are three major playbooks implemented currently:

- `playbooks/provision.yml`
- `playbooks/devescops.yml`
- `playbooks/destroy.yml`

Additionally, there are three important vars files currently:

- `vars/provision.yml`
- `vars/devsecops.yml`
- `vars/common.yml`

There are a significant number of in-flux roles that are part of building the cluster and workshop content. You should explore individual roles on your own, or look at how the playbooks use them to understand their operation. The intent of the final release of this repo is that the roles will be capable of being developed/maintained independently, and they may be split into separate repositories with role depdendency, git submodules, or some combination of the two used to install them from GitHub or another SCM.

### Playbooks

---

#### playbooks/provision.yml

This playbook will, given access to AWS keys for an administrator account on which Route53 is managing DNS, provision an OpenShift 4.x cluster using the latest installer for the specified major.minor release.
Future plans for this playbook:

- Implement provisioning for other CCSPs (TBD)

#### playbooks/devescops.yml

This playbook will deploy all of the services to be used in the workshop. First it adjusts the cluster to be ready to accept workshop content by doing the following:

- Create htpasswd-backed users based on the vars provided
- Delete the kubeadmin default user, if present
- Generate and apply LetsEncrypt certificates for both the API endpoint and the default certificate for the OpenShift Router (If you have AWS keys sourced or included in vars)
- Enable Machine and Cluster Autoscalers to allow the cluster to remain as small as possible (two 2xlarge instances as workers by default) until a load requires more nodes to be provisioned.
- Change the console route to `console.apps.{{ cluster_name }}.{{ openshift_base_domain }}` because `console-openshift-console.apps` was deemed to be _just a bit much_.

As a rule, it uses Operators for the provisioning/management of all services. Where an appropriate Operator was available in the default catalog sources, those were used. Where one doesn't exist, they were sourced from Red Hat GPTE published content - or forked from that content and maintained by us. Also as a rule, it tries to stand up only one of each service and provision users on each service. The roles have all been designed such that they attempt to deploy sane defaults in the absence of custom variables, but there should be enough configuration available through templated variables that the roles are valuable outside of the scope of this workshop.

The services provided are currently in rapid flux and you should simply look through the listing to see what's applied. For roles to be implemented or changed in the future, please refer to GitHub Issues as these are the tracking mechanism we're using.

#### playbooks/destroy.yml

This playbook will, provided a common.yml, identify if openshift-install was run from this host and confirm you would like to remove this cluster. It will completely tear the cluster down, and remove everything from the temporary directory for this cluster.

### Variable Files

---

#### vars/CLUSTER/common.yml

These variables include things that are important for both an RHPDS-deployed cluster and a cluster deployed from this project. They either define where the cluster is for connection, or they define how to deploy and later connect to the cluster. For clusters created with this project, it also indicates how to destroy the cluster.

#### vars/CLUSTER/provision.yml

The primary function of these variables is to provide information necessary to the `provision.yml` playbook for deploymen of the cluster. Future plans for this file align with the future plans for the playbook, intended to enable more infrastrucure platforms.

#### vars/CLUSTER/devsecops.yml

This mostly contains switches to enable or disable workshop services and infrastructure. It's also used right now to control from which GitHub project the various GPTE-built operators are sourced.

## Contributing

We welcome pull requests and issues. Please, follow the overall design goals if making a pull request.
