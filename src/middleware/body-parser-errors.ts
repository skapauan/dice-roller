export const bodyParserErrors: {[key: string]: string} = {
    'encoding.unsupported': 'The encoding in Content-Encoding header is not supported',
    'entity.parse.failed': 'Request had invalid syntax and could not be parsed',
    'entity.verify.failed': 'Verification failed',
    'request.aborted': 'Request was aborted by the client',
    'entity.too.large': 'Request body was too big',
    'request.size.invalid': 'Request size did not match Content-Length header',
    'stream.encoding.set': 'Server error: Stream encoding should not be set',
    'parameters.too.many': 'Request had too many URL parameters',
    'charset.unsupported': 'The charset in Content-Type header is not supported'
}