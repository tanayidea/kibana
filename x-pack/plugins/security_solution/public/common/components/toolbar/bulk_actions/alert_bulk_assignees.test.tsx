/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../mock';
import { useGetUserProfiles } from '../../../../detections/containers/detection_engine/alerts/use_get_user_profiles';
import { useSuggestUsers } from '../../../../detections/containers/detection_engine/alerts/use_suggest_users';

import { BulkAlertAssigneesPanel } from './alert_bulk_assignees';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_get_user_profiles');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_suggest_users');

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'user2' }, data: {} },
];

const mockSuggestedUserProfiles = [
  ...mockUserProfiles,
  { uid: 'user-id-3', enabled: true, user: { username: 'user3' }, data: {} },
  { uid: 'user-id-4', enabled: true, user: { username: 'user4' }, data: {} },
];

const mockAlertsWithAssignees = [
  {
    _id: 'test-id',
    data: [
      {
        field: ALERT_WORKFLOW_ASSIGNEE_IDS,
        value: ['user-id-1', 'user-id-2'],
      },
    ],
    ecs: { _id: 'test-id' },
  },
  {
    _id: 'test-id',
    data: [
      {
        field: ALERT_WORKFLOW_ASSIGNEE_IDS,
        value: ['user-id-1', 'user-id-2'],
      },
    ],
    ecs: { _id: 'test-id' },
  },
];

(useGetUserProfiles as jest.Mock).mockReturnValue({
  loading: false,
  userProfiles: mockUserProfiles,
});
(useSuggestUsers as jest.Mock).mockReturnValue({
  loading: false,
  userProfiles: mockSuggestedUserProfiles,
});

const renderAssigneesMenu = (
  items: TimelineItem[],
  closePopover: () => void = jest.fn(),
  onSubmit: () => Promise<void> = jest.fn(),
  setIsLoading: () => void = jest.fn()
) => {
  return render(
    <TestProviders>
      <BulkAlertAssigneesPanel
        alertItems={items}
        setIsLoading={setIsLoading}
        closePopoverMenu={closePopover}
        onSubmit={onSubmit}
      />
    </TestProviders>
  );
};

describe('BulkAlertAssigneesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const wrapper = renderAssigneesMenu(mockAlertsWithAssignees);

    expect(wrapper.getByTestId('alert-assignees-update-button')).toBeInTheDocument();
    expect(useSuggestUsers).toHaveBeenCalled();
  });

  test('it calls expected functions on submit when nothing has changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const wrapper = renderAssigneesMenu(
      mockAlertsWithAssignees,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-assignees-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).not.toHaveBeenCalled();
    expect(mockedSetIsLoading).not.toHaveBeenCalled();
  });

  test('it updates state correctly', () => {
    const wrapper = renderAssigneesMenu(mockAlertsWithAssignees);

    const deselectUser = (userName: string, index: number) => {
      expect(wrapper.getAllByRole('option')[index]).toHaveAttribute('title', userName);
      expect(wrapper.getAllByRole('option')[index]).toBeChecked();
      act(() => {
        fireEvent.click(wrapper.getByText(userName));
      });
      expect(wrapper.getAllByRole('option')[index]).toHaveAttribute('title', userName);
      expect(wrapper.getAllByRole('option')[index]).not.toBeChecked();
    };

    const selectUser = (userName: string, index = 0) => {
      expect(wrapper.getAllByRole('option')[index]).toHaveAttribute('title', userName);
      expect(wrapper.getAllByRole('option')[index]).not.toBeChecked();
      act(() => {
        fireEvent.click(wrapper.getByText(userName));
      });
      expect(wrapper.getAllByRole('option')[index]).toHaveAttribute('title', userName);
      expect(wrapper.getAllByRole('option')[index]).toBeChecked();
    };

    deselectUser('user1', 0);
    deselectUser('user2', 1);
    selectUser('user3', 2);
    selectUser('user4', 3);
  });

  test('it calls expected functions on submit when alerts have changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const wrapper = renderAssigneesMenu(
      mockAlertsWithAssignees,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );
    act(() => {
      fireEvent.click(wrapper.getByText('user1'));
    });
    act(() => {
      fireEvent.click(wrapper.getByText('user2'));
    });
    act(() => {
      fireEvent.click(wrapper.getByText('user3'));
    });
    act(() => {
      fireEvent.click(wrapper.getByText('user4'));
    });

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-assignees-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalledWith(
      {
        assignees_to_add: ['user-id-4', 'user-id-3'],
        assignees_to_remove: ['user-id-1', 'user-id-2'],
      },
      ['test-id', 'test-id'],
      expect.anything(), // An anonymous callback defined in the onSubmit function
      mockedSetIsLoading
    );
  });
});
