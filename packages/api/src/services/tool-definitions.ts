import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const AI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_customer_profile',
      description: 'Retrieve the profile and contact details of the currently authenticated customer.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_orders',
      description: 'List recent orders for the currently authenticated customer.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of orders to retrieve (default 5)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_details',
      description: 'Retrieve full details for a specific order by orderId, including line items and shipping status.',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID (e.g., ord-1001)',
          },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: 'Get current shipment status, tracking number, and estimated delivery date for an order.',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID (e.g., ord-1001)',
          },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search the product catalog for specifications, pricing, stock, warranty, and return policies.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product name, SKU, or keyword to search for',
          },
          category: {
            type: 'string',
            description: 'Optional category filter (e.g., Laptops, Audio, Monitors, Furniture, Accessories)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get full specifications, warranty, and return policy for a specific product by productId.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Product ID (e.g., prod-101)',
          },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_refund_status',
      description: 'Check refund status or calculate return/refund eligibility for an order based on delivery date and return window.',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'Order ID to evaluate refund eligibility for',
          },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_support_ticket',
      description: 'Create a formal support ticket for issues that require staff investigation or human review.',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Brief summary of the issue',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the customer inquiry or problem',
          },
          category: {
            type: 'string',
            description: 'Category: GENERAL, BILLING, SHIPPING, TECHNICAL, REFUND',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Priority level of the ticket',
          },
        },
        required: ['subject', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_support_ticket',
      description: 'Look up the status and details of an existing support ticket by ticketId.',
      parameters: {
        type: 'object',
        properties: {
          ticketId: {
            type: 'string',
            description: 'The support ticket ID (e.g., tik-201)',
          },
        },
        required: ['ticketId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_support_ticket',
      description: 'Add information or update an existing support ticket.',
      parameters: {
        type: 'object',
        properties: {
          ticketId: {
            type: 'string',
            description: 'Ticket ID to update',
          },
          notes: {
            type: 'string',
            description: 'Additional customer message or update to append',
          },
        },
        required: ['ticketId', 'notes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Escalate the current support conversation to a human support agent. Use this when the customer asks for a human, when frustration is detected, or when complex manual action is needed.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'The clear reason for escalation (e.g., "Customer requested human agent", "Frustration detected", "Complex refund authorization needed")',
          },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Perform semantic RAG search across company policy guides, warranty documents, troubleshooting manuals, and terms.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query regarding policies, repairs, or procedures',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_faq',
      description: 'Search frequently asked questions and official answers.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'FAQ topic or question keyword',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_customer',
      description: 'Search customer database (Admin / Internal Agent tool only). Forbidden for standard customer chat.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Customer name or email to search',
          },
        },
        required: ['query'],
      },
    },
  },
];
