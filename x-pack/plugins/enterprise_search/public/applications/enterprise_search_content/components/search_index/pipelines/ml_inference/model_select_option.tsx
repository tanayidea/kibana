/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiRadio, EuiTextColor, EuiTitle } from '@elastic/eui';

import {
  getMlModelTypesForModelConfig,
  parseModelStateFromStats,
  parseModelStateReasonFromStats,
} from '../../../../../../../common/ml_inference_pipeline';
import { TrainedModel } from '../../../../api/ml_models/ml_trained_models_logic';
import { getMLType, getModelDisplayTitle } from '../../../shared/ml_inference/utils';

import { TrainedModelHealth } from '../ml_model_health';
import { MLModelTypeBadge } from '../ml_model_type_badge';

export interface ModelSelectOptionProps {
  model: TrainedModel;
  label: string;
  checked?: 'on';
}

export const ModelSelectOption: React.FC<ModelSelectOptionProps> = ({ model, checked }) => {
  const type = getMLType(getMlModelTypesForModelConfig(model));
  const title = getModelDisplayTitle(type);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiRadio id={model.model_id} checked={checked === 'on'} onChange={() => null} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{title ?? model.model_id}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
              {title && (
                <EuiFlexItem>
                  <EuiTextColor color="subdued">{model.model_id}</EuiTextColor>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <TrainedModelHealth
                  modelState={parseModelStateFromStats(model)}
                  modelStateReason={parseModelStateReasonFromStats(model)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>
                    <MLModelTypeBadge type={type} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
