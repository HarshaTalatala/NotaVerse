import { HttpResponseInit } from '@azure/functions';

export function createCorsResponse(data: any, status: number = 200): HttpResponseInit {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role',
      'Access-Control-Max-Age': '3600'
    },
    body: JSON.stringify(data)
  };
}

export function handlePreflightRequest(): HttpResponseInit {
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role',
      'Access-Control-Max-Age': '3600'
    }
  };
}