import { Tip } from "./types";

export const TipsCollection: Record<string, Tip[]> = {
  projectCreation: [{
    title: "Did you know?",
    content: "It’s easier to find the projects when you organize them into workspaces using Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "find_and_manage_projects",
      },
    },
  }, {
    title: "Unlock faster access provisioning",
    content: "Streamline assigning staff to multiple projects by assigning them to workspaces in Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "faster_provisioning",
      },
    },
  }, {
    title: "Did you know?",
    content: "Users with the Manager role can supervise a set of projects by assigning them to workspaces in Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "supervise_projects",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can control access to specific projects and workspaces for internal team members and external annotators using Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "access_to_projects",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can use or modify dozens or templates to configure your labeling UI, or create a custom configuration from scratch using simple XML-like tag.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "templates",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can label tasks with collaborators by setting the minimum number of annotations to more than one. ",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_creation_tip",
        treatment: "label_with_collaborators",
      },
    },
  }],
  organizationPage: [{
    title: "It looks like your team is growing!",
    content: "Assign roles to your team using Labelo and control access to sensitive data at the project and workspace levels.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "team_growing",
      },
    }
  }, {
    title: "Want to simplify and secure logging in?",
    content: "Enable Single Sign-On for your team using SAML, SCIM2 or LDAP with Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "enable_sso",
      },
    }
  }, {
    title: "Want to improve your labeling team’s efficiency?",
    content: "Gain insight into your annotators’ productivity with project performance dashboards in Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "project_performance",
      },
    }
  }, {
    title: "Want to automate task distribution?",
    content: "Create rules, automate how tasks are distributed to annotators, and only show tasks assigned to each annotator in their view.and control task visibility for each annotator.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "automate_distribution",
      },
    }
  }, {
    title: "Share knowledge with the community",
    content: "Have questions or a tip to share with other Labelo users? Join the community slack channel for the latest updates. ",
    closable: true,
    link: {
      label: "Join the community",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "share_knowledge",
      },
    }
  }, {
    title: "Did you know?",
    content: "Labelo supports multiple points of integration with cloud storage, machine learning models, and popular tools to automate your machine learning pipeline.",
    closable: true,
    link: {
      label: "Check out the integrations directory",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "organization_page_tip",
        treatment: "integration_points",
      },
    }
  }],
  projectSettings: [{
    title: "Did you know?",
    content: "You can automatically label and sort tasks by prediction score to maximize labeling efficiency in Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "prediction_score",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can increase the quality of your labeled data with reviewer workflows and task agreement scores using Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "quality_and_agreement",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can minimize the number of tasks to be labeled by setting up an automated active learning loop in Labelo.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "active_learning",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can save time managing infrastructure and upgrades, plus access more features for automation, quality, and team management, by using the Enterprise cloud service.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "infrastructure_and_upgrades",
      },
    },
  }, {
    title: "Did you know?",
    content: "You can connect ML models using the backend SDK to save time with pre-labeling or active learning.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "connect_ml_models",
      },
    },
  }, {
    title: "Faster image labeling",
    content: "You can add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse.",
    closable: true,
    link: {
      label: "Learn more",
      url: "https://docs.labelo.ai/",
      params: {
        experiment: "project_settings_tip",
        treatment: "two_clicks",
      },
    },
  }],
};
