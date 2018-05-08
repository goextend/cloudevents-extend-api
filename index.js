'use strict';

let events;

module.exports = () => {
    return (req, res, next) => {
      return events ? handleRequest() : compileHandler();
      
      function compileHandler() {
        req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, (e, func) => {
          if (e) return next(e);
          
          events = {};
          function on(spec, handler) {
            if (!Array.isArray(spec)) spec = [ spec ];
            if (typeof handler !== 'function') {
                let error = new Error('Second argument to the `on` call must be a function.');
                error.statusCode = 400;
                return next(error);
            }
            for (var i = 0; i < spec.length; i++) {
                if (typeof spec[i] !== 'string') {
                    let error = new Error('First argument to the `on` call must be a string or array of strings.');
                    error.statusCode = 400;
                    return next(error);
                }
                events[spec[i]] = handler;
            }
          }

          func({ on });
          
          return handleRequest();
        });
      }
      
      function handleRequest() {
        let auth;
        if (req.webtaskContext.secrets.BASIC_AUTH) {
          auth = new Buffer(req.webtaskContext.secrets.BASIC_AUTH).toString('base64');
        }
        if (auth) {
          let match = (req.headers.authorization || '').match(/^\s*Basic\s+([^\s]+)\s*$/);
          if (!match || match[1] !== auth) {
            let error = new Error('Unauthorized.');
            error.statusCode = 403;
            return next(error);
          }
        }
        let method = req.body.eventType;
        if (!method) {
          let error = new Error(`Malformed CloudEvent message. The required 'eventType' property is not specified.`);
          error.statusCode = 400;
          return next(error);
        }
        if (typeof events[method] !== 'function') {
          let error = new Error(`Unuspported eventType: ${method}.`);
          error.statusCode = 501;
          return next(error);
        }
        else {
          if (events[method].length === 1) {
            res.writeHead(201)
            res.end(); 
          }

          req.webtaskContext.body = req.body;
          return events[method](req.webtaskContext, (e,d) => {
            if (e) return next(e);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(d));
          });
        }
      }
    };
};
