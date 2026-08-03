#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "::error::Required command is not installed: $name" >&2
    exit 1
  fi
}

require_command aws
require_command jq

require_env ECS_CLUSTER
require_env IMAGE_REPOSITORY_PREFIX
require_env GITHUB_SHA
require_env ECS_IDENTITY_SERVICE
require_env ECS_AUCTION_SERVICE
require_env ECS_QUERY_SERVICE
require_env ECS_WEB_SERVICE

deploy_service() {
  local service_name="$1"
  local container_name="$2"
  local image="$3"

  echo "Deploying service '$service_name' with container '$container_name' -> $image"

  local task_definition_arn
  task_definition_arn="$({
    aws ecs describe-services \
      --cluster "$ECS_CLUSTER" \
      --services "$service_name" \
      --query 'services[0].taskDefinition' \
      --output text
  })"

  if [[ -z "$task_definition_arn" || "$task_definition_arn" == "None" ]]; then
    echo "::error::Could not resolve task definition for ECS service '$service_name' in cluster '$ECS_CLUSTER'" >&2
    exit 1
  fi

  local task_definition_json
  task_definition_json="$({
    aws ecs describe-task-definition \
      --task-definition "$task_definition_arn" \
      --query 'taskDefinition' \
      --output json
  })"

  local updated_task_definition_json
  updated_task_definition_json="$({
    jq \
      --arg image "$image" \
      --arg container "$container_name" \
      '
        del(
          .taskDefinitionArn,
          .revision,
          .status,
          .requiresAttributes,
          .compatibilities,
          .registeredAt,
          .registeredBy,
          .deregisteredAt
        )
        | .containerDefinitions |= map(
            if .name == $container then .image = $image else . end
          )
      ' <<<"$task_definition_json"
  })"

  if ! jq -e --arg container "$container_name" '.containerDefinitions[] | select(.name == $container)' <<<"$updated_task_definition_json" >/dev/null; then
    echo "::error::Container '$container_name' was not found in task definition '$task_definition_arn'" >&2
    exit 1
  fi

  local new_task_definition_arn
  new_task_definition_arn="$({
    aws ecs register-task-definition \
      --cli-input-json "$updated_task_definition_json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text
  })"

  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$service_name" \
    --task-definition "$new_task_definition_arn" \
    >/dev/null

  echo "Updated '$service_name' to task definition '$new_task_definition_arn'"
}

deploy_service "$ECS_IDENTITY_SERVICE" "${ECS_IDENTITY_CONTAINER:-identity-service}" "$IMAGE_REPOSITORY_PREFIX/identity-service:$GITHUB_SHA"
deploy_service "$ECS_AUCTION_SERVICE" "${ECS_AUCTION_CONTAINER:-auction-engine}" "$IMAGE_REPOSITORY_PREFIX/auction-engine:$GITHUB_SHA"
deploy_service "$ECS_QUERY_SERVICE" "${ECS_QUERY_CONTAINER:-query-service}" "$IMAGE_REPOSITORY_PREFIX/query-service:$GITHUB_SHA"
deploy_service "$ECS_WEB_SERVICE" "${ECS_WEB_CONTAINER:-takelow-web}" "$IMAGE_REPOSITORY_PREFIX/takelow-web:$GITHUB_SHA"

echo "Waiting for ECS services to become stable..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services \
    "$ECS_IDENTITY_SERVICE" \
    "$ECS_AUCTION_SERVICE" \
    "$ECS_QUERY_SERVICE" \
    "$ECS_WEB_SERVICE"

echo "ECS deployment completed successfully."