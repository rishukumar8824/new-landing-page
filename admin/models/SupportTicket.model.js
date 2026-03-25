const SupportTicketSchema = {
  id: 'string (unique)',
  userId: 'string',
  subject: 'string',
  status: 'OPEN | IN_PROGRESS | CLOSED',
  priority: 'LOW | MEDIUM | HIGH',
  assignedTo: 'string',
  messages: 'array',
  createdAt: 'date',
  updatedAt: 'date'
};

module.exports = {
  modelName: 'SupportTicket',
  collectionName: 'admin_support_tickets',
  SupportTicketSchema
};
