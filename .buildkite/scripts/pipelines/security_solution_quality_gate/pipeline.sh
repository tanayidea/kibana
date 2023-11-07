#!/bin/bash

set -euo pipefail

# ts-node .buildkite/scripts/pipelines/security_solution_quality_gate/pipeline.ts


QA_API_KEY=""
RP_API_KEY=""

BUILDKITE_BUILD_URL="kjhkjhkjh"
BUILDKITE_BUILD_CREATOR="Diamantis Kirchantzoglou"
BUILDKITE_BRANCH="dkirchan/unified-reporting"

finish_launch() {
    curl -k --location --request PUT "https://35.226.254.46/api/v1/test-development/launch/$1/finish" \
        --header "Content-Type: application/json" \
        --header "Authorization: Bearer $2" \
        --data '{
            "endTime": "'$(date -u "+%Y-%m-%dT%H:%M:%S+00:00")'"
        }'
    echo "Finished terminate launch"
}


EXECUTION_MODE_CI=${CI:-}
if [ $EXECUTION_MODE_CI == "true" ];
then
    EXECUTION_MODE="CI"
else
    EXECUTION_MODE="Local"
fi

DATE_BEFORE=$(date -u "+%Y-%m-%dT%H:%M:%S+00:00")
REQUEST_BODY='{
        "name": "security_solution_QA_cypress",
        "description": "The security solution cypress tests for QA quality gate\n'$BUILDKITE_BUILD_URL'",
        "startTime": "'$DATE_BEFORE'",
        "mode": "DEFAULT",
        "attributes": [
            {
                "value": "QA"
            },
            {   
                "key": "Creator",
                "value": "'$BUILDKITE_BUILD_CREATOR'"
            },
            {   
                "key": "Branch",
                "value": "'$BUILDKITE_BRANCH'"
            },
            {   
                "key": "Execution",
                "value": "'$EXECUTION_MODE'"
            }
        ]
    }'

LAUNCH_ID=$(curl -k --location "https://35.226.254.46/api/v1/test-development/launch" \
    --header "Content-Type: application/json" \
    --header "Authorization: Bearer $RP_API_KEY" \
    --data "$REQUEST_BODY" | jq -r '.id')

echo "Reportportal launch ID was created: $LAUNCH_ID"

cd ../../../../x-pack/test/security_solution_cypress

# LAUNCH_ID=$LAUNCH_ID RP_API_KEY=$RP_API_KEY PARALLEL_COUNT=2 CLOUD_QA_API_KEY=$QA_API_KEY yarn cypress:run:qa:serverless:parallel; status=$?; yarn junit:merge || :; finish_launch $LAUNCH_ID $RP_API_KEY
LAUNCH_ID=$LAUNCH_ID RP_API_KEY=$RP_API_KEY CLOUD_QA_API_KEY=$QA_API_KEY yarn cypress:run:qa:serverless:parallel; status=$?; echo "Finished parallel with status code $status";  finish_launch $LAUNCH_ID $RP_API_KEY


