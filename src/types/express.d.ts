import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * User information
       */
      user?: {
        /**
         * User ID
         */
        id: string;
        
        /**
         * Tenant ID
         */
        tenantId: string;
      };
      
      /**
       * Whether the request is authenticated
       */
      isAuthenticated?: boolean;
    }
  }
}
