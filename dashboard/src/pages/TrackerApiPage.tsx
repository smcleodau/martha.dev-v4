/**
 * Tracker API Explorer Page
 * Interactive API documentation using Swagger UI
 */

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function TrackerApiPage() {
  return (
    <div className="h-full w-full">
      <SwaggerUI
        url="/api/v1/docs/tracker-openapi"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
      />
    </div>
  );
}
