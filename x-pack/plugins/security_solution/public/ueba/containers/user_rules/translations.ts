/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_HOST_RULES = i18n.translate(
  'xpack.securitySolution.hostRules.errorSearchDescription',
  {
    defaultMessage: `An error has occurred on risk score search`,
  }
);

export const FAIL_HOST_RULES = i18n.translate(
  'xpack.securitySolution.hostRules.failSearchDescription',
  {
    defaultMessage: `Failed to run search on risk score`,
  }
);
