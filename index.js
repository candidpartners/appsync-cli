'use strict';

const request = require('request-promise-native');
const aws4    = require('aws4');
const nconf   = require('nconf');
const fs      = require('fs');
const ask     = require('node-ask');

nconf
.env()
.argv({
    AWS_ACCESS_KEY_ID     : { alias: 'accessKeyId'      },
    AWS_SECRET_ACCESS_KEY : { alias: 'secretAccessKey'  },
    AWS_SESSION_TOKEN     : { alias: 'sessionToken'     },
    endpoint              : { alias: 'endpoint'         },
    region                : { alias: 'region'           },
    query                 : { alias: 'query'            }
})
.file( '.appsync-cli' );

async function main() {

  let result = null;
  const questions = [];
  
  let AWS_ACCESS_KEY_ID     = nconf.get( 'AWS_ACCESS_KEY_ID' );
  let AWS_SECRET_ACCESS_KEY = nconf.get( 'AWS_SECRET_ACCESS_KEY' );
  let query     = nconf.get( 'query' );
  let endpoint  = nconf.get( 'endpoint' );
  let region    = nconf.get( 'region' );
  
  if( ! AWS_ACCESS_KEY_ID )     questions.push( { key: 'AWS_ACCESS_KEY_ID',   msg: 'AWS_ACCESS_KEY_ID: ', fn: 'prompt' } );
  if( ! AWS_SECRET_ACCESS_KEY ) questions.push( { key: 'AWS_SECRET_ACCESS_KEY',   msg: 'AWS_SECRET_ACCESS_KEY: ', fn: 'prompt' } );
  if( ! endpoint )              questions.push( { key: 'endpoint',   msg: 'Endpoint: ', fn: 'prompt' } );
  if( ! region )                questions.push( { key: 'region',   msg: 'Region: ', fn: 'prompt' } );
  if( ! query )                 questions.push( { key: 'query',   msg: "Query:", fn: 'multiline' } );

  const answers = await ask.ask( questions );

  AWS_ACCESS_KEY_ID     = AWS_ACCESS_KEY_ID     || answers.AWS_ACCESS_KEY_ID;
  AWS_SECRET_ACCESS_KEY = AWS_SECRET_ACCESS_KEY || answers.AWS_SECRET_ACCESS_KEY;
  endpoint              = endpoint              || answers.endpoint;
  region                = region                || answers.region;
  query                 = query                 || answers.query;
  
  const config = { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, endpoint, region };
  fs.writeFileSync( '.appsync-cli', JSON.stringify( config, null, 2 ) );

  const gql = { query };

  const options = {
    host : endpoint,
    path: "/graphql",
    method: "POST",
    headers: {
      'content-type': 'application/json'
    },
    service: 'appsync',
    region,
    body: JSON.stringify( gql )
  };  
  
  try {
    
    const signRes = aws4.sign(options, {
      accessKeyId     : nconf.get( 'AWS_ACCESS_KEY_ID'      ),
      secretAccessKey : nconf.get( 'AWS_SECRET_ACCESS_KEY'  ),
      sessionToken    : nconf.get( 'AWS_SESSION_TOKEN'      )
    });
    
    console.log( '--------------- RESULTS ---------------' );
    
    result = await request.post({
      url : `https://${endpoint}/graphql`,
      headers: {
        'authorization'         : signRes.headers.Authorization,
        'x-amz-date'            : signRes.headers['X-Amz-Date'],
        'x-amz-security-token'  : signRes.headers['X-Amz-Security-Token']
      },
      json: true,
      body : gql
    });
  } catch( err ) {
    console.log( err.message );
  }

  console.log( result );
  
}

main();


