
export const API_CONFIG = {
  gateway: `${window.APP_SETTINGS.hostname}/api`,
  endpoints: {
    // Users
    users: "/users",
    me: "/current-user/whoami",

    // Organization
    memberships: "/organizations/:pk/memberships",
    updatememberships: "PATCH:/organizations/:pk/memberships/update/:user_id",
    inviteMemberbyEmail: "POST:/invite/send-mail",
    inviteLink: "/invite",
    resetInviteLink: "POST:/invite/reset-token",
    resendInvitation :"POST:/invite/resend-mail",
    revokeInvitation :"POST:/invite/revoke",
    getOrganizations: "GET:/organizations",
    createOrganization: "POST:/organizations",
    switchOrganizations: "PATCH:/user/:pk/switch-organization",
    deleteUserOrganisation: "DELETE:/organizations/:pk/memberships/:user_pk",
    deleteOrganization: "DELETE:/organizations/:pk/delete",
    editOrganization: "PATCH:/organizations/:pk",

    // Project
    projects: "/projects",
    project: "/projects/:pk",
    updateProject: "PATCH:/projects/:pk",
    createProject: "POST:/projects",
    deleteProject: "DELETE:/projects/:pk",
    projectResetCache: "POST:/projects/:pk/summary/reset",
    duplicateProject: "POST:/projects/:pk/duplicate",
    bulkDelete: "DELETE:/projects/bulk-delete",

    //manage members
    members : "GET:/projects/:pk/members",
    createMembers : "POST:/projects/:pk/members",
    getSelectedUsers : "GET:/projects/:pk/get-users/",
    removeMember : "DELETE:/projects/:pk/members",

    //Project Template
    createTemplate : "POST:/project_templates/",
    getProjectTemplate : "GET:/project_templates/",
    createProjectTemplate : "POST:/project_templates/create_project",
    updateProjectTemplate : "PATCH:/project_templates/:pk",
    deleteProjectTemplate :"DELETE:/project_templates/:pk",

    // Presigning
    presignUrlForTask: "/../tasks/:taskID/presign",
    presignUrlForProject: "/../projects/:projectId/presign",

    // Config and Import
    configTemplates: "/templates",
    validateConfig: "POST:/projects/:pk/validate",
    createSampleTask: "POST:/projects/:pk/sample-task",
    fileUploads: "/projects/:pk/file-uploads",
    deleteFileUploads: "DELETE:/projects/:pk/file-uploads",
    importFiles: "POST:/projects/:pk/import",
    reimportFiles: "POST:/projects/:pk/reimport",
    dataSummary: "/projects/:pk/summary",

    // DM
    deleteTabs: 'DELETE:/dm/views/reset',

    // Storages
    listStorages: "/storages/:target?",
    storageTypes: "/storages/:target?/types",
    storageForms: "/storages/:target?/:type/form",
    createStorage: "POST:/storages/:target?/:type",
    deleteStorage: "DELETE:/storages/:target?/:type/:pk",
    updateStorage: "PATCH:/storages/:target?/:type/:pk",
    syncStorage: "POST:/storages/:target?/:type/:pk/sync",
    validateStorage: "POST:/storages/:target?/:type/validate",

    // ML
    mlBackends: "GET:/ml",
    mlBackend: "GET:/ml/:pk",
    addMLBackend: "POST:/ml",
    updateMLBackend: "PATCH:/ml/:pk",
    deleteMLBackend: "DELETE:/ml/:pk",
    trainMLBackend: "POST:/ml/:pk/train",
    predictWithML: "POST:/ml/:pk/predict/test",
    projectModelVersions: "/projects/:pk/model-versions",
    deletePredictions: "DELETE:/projects/:pk/model-versions",
    modelVersions: "/ml/:pk/versions",
    mlInteractive: "POST:/ml/:pk/interactive-annotating",

    // Export
    export: "/projects/:pk/export",
    previousExports: "/projects/:pk/export/files",
    exportFormats: "/projects/:pk/export/formats",

    // Version
    version: '/version',

    // Webhook
    webhooks: "/webhooks",
    webhook: "/webhooks/:pk",
    updateWebhook: "PATCH:/webhooks/:pk",
    createWebhook: "POST:/webhooks",
    deleteWebhook: "DELETE:/webhooks/:pk",
    webhooksInfo: "/webhooks/info",

    //Workspace
    createWorkspace: "POST:/workspaces/",
    getWorkspaces: "GET:/workspaces/",
    getProjectsByWorkspace: "GET:/workspaces/:pk/projects",
    deleteWorkspace: "DELETE:/workspaces/:pk",
    editAndArchiveWorkspace: "PATCH:/workspaces/:pk",
    workspaceMembers: "POST:/workspaces/:pk/members",
    getWorkspaceMembers: "GET:/workspaces/:pk/members",

    // Dashboard
    dashboard: "/projects/:pk/dashboard",
    dashboardChart: "/projects/:pk/dashboard/chart",
    dashboardLayout: "/projects/:pk/dashboard_viewset",
    editDashboardLayout: "POST:/projects/:pk/dashboard_viewset",

    // Notifications
    getNotifications: "GET:/notifications",
    addNotifications: "POST:/notifications", // Test only
    setReadNotification: "POST:/notification/read/:pk",
  },
  alwaysExpectJSON: false,
};
