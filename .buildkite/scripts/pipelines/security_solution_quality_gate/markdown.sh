if [ -z "${KIBANA_LATEST+x}" ]; then
    KIBANA_OVERRIDE_FLAG=$(buildkite-agent meta-data get kibana_override --default 0)
    echo "OVERRIDING KIBANA FROM CONFIG_PANE : $KIBANA_OVERRIDE_FLAG"
else
    KIBANA_OVERRIDE_FLAG=$KIBANA_LATEST
    echo "OVERRIDING KIBANA FROM TRIGGER : $KIBANA_OVERRIDE_FLAG"
fi

if [ "$KIBANA_OVERRIDE_FLAG" = "1" ]; then
    echo "KIBANA_OVERRIDE_FLAG is equal to 1"
    echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
    docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest
    build_date=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
    vcs_ref=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
    vcs_url=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
    version=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.version"')
    markdown_text="""
        # Kibana Container Metadata
        * Build Date        : $build_date 
        * GH commit hash    : $vcs_ref 
        * Github Repo       : $vcs_url 
        * Version           : $version
    """

    echo "${markdown_text//[*\\_]/\\&}" | buildkite-agent annotate --style "info"
    # echo -e "\`\`\`term\n*Kibana Container Metadata*\n- build-date: $build_date\n- vcs-ref: $vcs_ref\n- vcs-url: $vcs_url\n- version: $version\n\`\`\`" | buildkite-agent annotate --style "info"
else
    echo "KIBANA_OVERRIDE_FLAG is $KIBANA_OVERRIDE_FLAG"
fi 





