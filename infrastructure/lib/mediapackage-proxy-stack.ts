import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class MediaPackageProxyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get ECR repository name from environment or use default
    const ecrRepoName = process.env.ECR_REPO_NAME || 'mediapackage-proxy';
    const imageTag = process.env.IMAGE_TAG || 'latest';

    // ECR repository (assumes it exists or will be created separately)
    const repository = ecr.Repository.fromRepositoryName(
      this,
      'ECRRepository',
      ecrRepoName
    );

    // Lambda function from Docker image
    const lambdaFunction = new lambda.DockerImageFunction(this, 'MediaPackageProxyFunction', {
      code: lambda.DockerImageCode.fromEcr(repository, {
        tagOrDigest: imageTag,
      }),
      functionName: 'mediapackage-proxy',
      description: 'Express.js MediaPackage proxy with content steering',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        PROXY_TARGET: process.env.PROXY_TARGET || 'https://6180c994cb835402.mediapackage.eu-west-1.amazonaws.com',
        NODE_ENV: 'production',
      },
      // Enable function URL
      architecture: lambda.Architecture.X86_64,
    });

    // Grant necessary permissions
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    // Create Function URL
    const functionUrl = lambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // Use AWS_IAM for production
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [
          lambda.HttpMethod.GET,
          lambda.HttpMethod.POST,
          lambda.HttpMethod.PUT,
          lambda.HttpMethod.DELETE,
        ],
        allowedHeaders: ['*'],
        maxAge: cdk.Duration.seconds(3600),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: functionUrl.url,
      description: 'MediaPackage Proxy Function URL',
      exportName: 'MediaPackageProxyFunctionUrl',
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: lambdaFunction.functionName,
      description: 'Lambda Function Name',
      exportName: 'MediaPackageProxyFunctionName',
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: lambdaFunction.functionArn,
      description: 'Lambda Function ARN',
      exportName: 'MediaPackageProxyFunctionArn',
    });
  }
}
