/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { ModelSelect } from './model_select';
import { ModelSelectOption } from './model_select_option';

const DEFAULT_VALUES = {
  supportedMLModels: [
    {
      model_id: 'model_1',
    },
    {
      model_id: 'model_2',
    },
    {
      model_id: 'model_3',
    },
  ],
  addInferencePipelineModal: { configuration: {} },
};

describe('ModelSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders without selected model', () => {
    const wrapper = mount(<ModelSelect />);
    expect(wrapper.find(ModelSelectOption).length).toBe(3);
    wrapper
      .find(ModelSelectOption)
      .forEach((option) => expect(option.prop('checked')).toBeUndefined());
  });
  it('renders with a selected model', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          modelID: 'model_2',
        },
      },
    });
    const wrapper = mount(<ModelSelect />);
    expect(wrapper.find(ModelSelectOption).length).toBe(3);
    expect(wrapper.find(ModelSelectOption).at(1).prop('checked')).toBe('on');
  });
});
