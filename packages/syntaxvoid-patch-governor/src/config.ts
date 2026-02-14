export default {
    riskThreshold: {
        title: 'Risk Threshold',
        description: 'Risk score above which confirmation is required.',
        type: 'integer',
        default: 10,
        minimum: 0
    },
    enableAuditLog: {
        title: 'Enable Audit Log',
        type: 'boolean',
        default: true
    }
};
