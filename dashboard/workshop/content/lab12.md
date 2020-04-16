# Add Create Dev Stage

Add Create Dev Stage into the pipeline.

<img src="images/pipeline_create_dev.png" width="900" />

We first check if an deployment config for the Dev Project already exists.  If it does not exists, a new application is created and deployment config is defined for the Dev Project.

Before a trigger is created, the pipeline sleeps for 10 seconds.  A deployment configuration can contain triggers, which drive the creation of new deployment processes in response to events inside the cluster.  In this case, the trigger is set to a manual deployment of the tasks deployment config.  The deployment will happen in Deploy Stage.

<br>

# Append to Jenkins Pipeline Configuration

In Builds > Pipelines > tasks-pipeline > Actions > Edit

<img src="images/pipeline_actions_edit.png" width="900" />

Append the text below to the bottom of the Jenkins Pipeline Configuration.  Please make sure to append to the beginning of the next line.  

```copy
    stage('Create DEV') {
      when {
        expression {
          openshift.withCluster() {
            openshift.withProject(env.DEV_PROJECT) {
              return !openshift.selector('dc', 'tasks').exists()
            }
          }
        }
      }
      steps {
        script {
          openshift.withCluster() {
            openshift.withProject(env.DEV_PROJECT) {
              def app = openshift.newApp("tasks:latest")
              app.narrow("svc").expose();

              def dc = openshift.selector("dc", "tasks")
              while (dc.object().spec.replicas != dc.object().status.availableReplicas) {
                  sleep 10
              }
              openshift.set("triggers", "dc/tasks", "--manual")
            }
          }
        }
      }
    }

```

# Deploy Dev Stage

Enter the Deploy Dev Stage to your pipeline text file.  

<img src="images/pipeline_deploy_dev.png" width="900" />

OpenShift deploys the application and it's deployment configuration to Dev as previously defined from the Create Dev Stage.

<br>

# Append to Jenkins Pipeline Configuration

In Builds > Pipelines > tasks-pipeline > Actions > Edit

<img src="images/pipeline_actions_edit.png" width="900" />

Append the text below to the bottom of the Jenkins Pipeline Configuration.  Please make sure to append to the beginning of the next line.  


```copy
    stage('Deploy DEV') {
      steps {
        script {
          openshift.withCluster() {
            openshift.withProject(env.DEV_PROJECT) {
              openshift.selector("dc", "tasks").rollout().latest();
            }
          }
        }
      }
    }

```


# Test Your Pipeline
If you'd like to do a test of first pipeline stage, add the following brackets at the end of your Jenkinsfile. Make sure to append to the beginning of the last line.

```copy
  }
}

```

Save your Jenkinsfile.

Go back to Builds > Pipelines

Click Start Pipeline

# Delete Brackets
Please delete the brackets you just added once testing is complete. We can add them later if you'd like to test your pipeline as you go along.

```
  }
}
```
Click Save

