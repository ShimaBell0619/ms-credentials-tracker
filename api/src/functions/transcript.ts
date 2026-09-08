import { app, type HttpRequest, type InvocationContext } from '@azure/functions';
import { handleTranscriptRequest } from '../transcript-endpoint.ts';

async function transcript(request: HttpRequest, _context: InvocationContext) {
  return handleTranscriptRequest(request);
}

app.http('transcript', {
  route: 'transcript',
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: transcript,
});
