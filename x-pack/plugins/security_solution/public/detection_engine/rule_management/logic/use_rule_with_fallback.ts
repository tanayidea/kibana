/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { isNotFoundError } from '@kbn/securitysolution-t-grid';
import { useEffect, useMemo } from 'react';
import type { InvestigationFields, RuleResponse } from '../../../../common/api/detection_engine';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { InvestigationFieldsCombined } from '../../../../server/lib/detection_engine/rule_schema';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import type { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { transformInput } from '../../../detections/containers/detection_engine/rules/transforms';
import * as i18n from './translations';
import { useRule } from './use_rule';

interface UseRuleWithFallback {
  error: unknown;
  loading: boolean;
  isExistingRule: boolean;
  refresh: () => void;
  rule: RuleResponse | null;
}

interface AlertHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    signal?: {
      rule?: RuleResponse;
    };
    kibana?: {
      alert?: {
        rule?: RuleResponse;
      };
    };
  };
}

// TODO: Create proper types for nested/flattened RACRule once contract w/ Fields API is finalized.
interface RACRule {
  kibana: {
    alert: {
      rule: {
        parameters?: {};
      };
    };
  };
}

const buildLastAlertQuery = (ruleId: string) => ({
  query: {
    bool: {
      filter: [
        {
          bool: {
            should: [
              { match: { 'signal.rule.id': ruleId } },
              { match: { [ALERT_RULE_UUID]: ruleId } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
  size: 1,
});

/**
 * We try to fetch the rule first. If the request fails with 404, that could mean that the rule was deleted.
 * In that case, try to fetch the latest alert generated by the rule and retrieve the rule data from the alert (fallback).
 */
export const useRuleWithFallback = (ruleId: string): UseRuleWithFallback => {
  const { isFetching: ruleLoading, data: ruleData, error, refetch } = useRule(ruleId, false);
  const { addError } = useAppToasts();

  const isExistingRule = !isNotFoundError(error);

  const { loading: alertsLoading, data: alertsData } = useQueryAlerts<AlertHit, undefined>({
    query: buildLastAlertQuery(ruleId),
    skip: isExistingRule,
    queryName: ALERTS_QUERY_NAMES.BY_RULE_ID,
  });

  useEffect(() => {
    if (error != null && !isNotFoundError(error)) {
      addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    }
  }, [addError, error]);

  const rule = useMemo<RuleResponse | undefined>(() => {
    const result = isExistingRule
      ? ruleData
      : alertsData == null
      ? undefined
      : transformRuleFromAlertHit(alertsData);
    if (result) {
      return transformInput(result);
    }
  }, [isExistingRule, alertsData, ruleData]);

  return {
    error,
    loading: ruleLoading || alertsLoading,
    refresh: refetch,
    rule: rule ?? null,
    isExistingRule,
  };
};

/**
 * In 8.10.x investigation_fields is mapped as alert, moving forward, it will be mapped
 * as an object. This util is being used for the use case where a rule is deleted and the
 * hook falls back to using the alert document to retrieve rule information. In this scenario
 * we are going to return undefined if field is in legacy format to avoid any possible complexity
 * in the UI for such flows. See PR 169061
 * @param investigationFields InvestigationFieldsCombined | undefined
 * @returns InvestigationFields | undefined
 */
export const migrateLegacyInvestigationFields = (
  investigationFields: InvestigationFieldsCombined | undefined
): InvestigationFields | undefined => {
  if (investigationFields && Array.isArray(investigationFields)) {
    return undefined;
  }

  return investigationFields;
};

/**
 * In 8.10.x investigation_fields is mapped as alert, moving forward, it will be mapped
 * as an object. This util is being used for the use case where a rule is deleted and the
 * hook falls back to using the alert document to retrieve rule information. In this scenario
 * we are going to return undefined if field is in legacy format to avoid any possible complexity
 * in the UI for such flows. See PR 169061
 * @param rule Rule
 * @returns Rule
 */
export const migrateRuleWithLegacyInvestigationFieldsFromAlertHit = (
  rule: RuleResponse
): RuleResponse => {
  if (!rule) return rule;

  return {
    ...rule,
    investigation_fields: migrateLegacyInvestigationFields(rule.investigation_fields),
  };
};

/**
 * Transforms an alertHit into a Rule
 * @param data raw response containing single alert
 */
export const transformRuleFromAlertHit = (
  data: AlertSearchResponse<AlertHit>
): RuleResponse | undefined => {
  // if results empty, return rule as undefined
  if (data.hits.hits.length === 0) {
    return undefined;
  }
  const hit = data.hits.hits[0];

  // If pre 8.x alert, pull directly from alertHit
  const rule = hit._source.signal?.rule ?? hit._source.kibana?.alert?.rule;

  // If rule undefined, response likely flattened
  if (rule == null) {
    const expandedRuleWithParams = expandDottedObject(hit._source ?? {}) as RACRule;
    const expandedRule = {
      ...expandedRuleWithParams?.kibana?.alert?.rule,
      ...expandedRuleWithParams?.kibana?.alert?.rule?.parameters,
    };
    delete expandedRule.parameters;
    return migrateRuleWithLegacyInvestigationFieldsFromAlertHit(expandedRule as RuleResponse);
  }

  return migrateRuleWithLegacyInvestigationFieldsFromAlertHit(rule);
};
