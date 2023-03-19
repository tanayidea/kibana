/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

import { schema } from '@kbn/config-schema';
import { ContentManagementServiceDefinitionVersioned } from '@kbn/object-versioning';
import { validate } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
import { EventBus } from '../../core/event_bus';
import { getServiceObjectTransformFactory } from '../services_transforms_factory';
import { bulkGet } from './bulk_get';

const { fn, schemas } = bulkGet;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [bulkGet] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [bulkGet] procedure.`);
}

const FOO_CONTENT_ID = 'foo';

describe('RPC -> bulkGet()', () => {
  describe('Input/Output validation', () => {
    const ids = ['123', '456'];
    const validInput = { contentTypeId: 'foo', ids, version: 1 };

    /**
     * These tests are for the procedure call itself. Every RPC needs to declare in/out schema
     * We will test _specific_ validation schema inside the procedure in separate tests.
     */
    test('should validate that a contentTypeId and "ids" array is passed', () => {
      [
        { input: validInput },
        {
          input: omit(validInput, 'contentTypeId'),
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: omit(validInput, 'version'),
          expectedError: '[version]: expected value of type [number] but got [undefined]',
        },
        {
          input: { ...validInput, version: '1' }, // string number is OK
        },
        {
          input: omit(validInput, 'ids'),
          expectedError: '[ids]: expected value of type [array] but got [undefined]',
        },
        {
          input: { ...validInput, ids: [] }, // ids array needs at least one value
          expectedError: '[ids]: array size is [0], but cannot be smaller than [1]',
        },
        {
          input: { ...validInput, ids: [''] }, // ids must havr 1 char min
          expectedError: '[ids.0]: value has length [0] but it must have a minimum length of [1].',
        },
        {
          input: { ...validInput, ids: 123 }, // ids is not an array of string
          expectedError: '[ids]: expected value of type [array] but got [number]',
        },
        {
          input: { ...validInput, unknown: 'foo' },
          expectedError: '[unknown]: definition for this key is missing',
        },
      ].forEach(({ input, expectedError }) => {
        const error = validate(input, inputSchema);

        if (!expectedError) {
          try {
            expect(error).toBe(null);
          } catch (e) {
            throw new Error(`Expected no error but got [{${error?.message}}].`);
          }
        } else {
          expect(error?.message).toBe(expectedError);
        }
      });
    });

    test('should allow an options "object" to be passed', () => {
      let error = validate(
        {
          contentTypeId: 'foo',
          ids: ['123'],
          version: 1,
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          version: 1,
          ids: ['123'],
          options: 123, // Not an object
        },
        inputSchema
      );

      expect(error?.message).toBe(
        '[options]: expected a plain object value, but found [number] instead.'
      );
    });

    test('should validate that the response is an object or an array of object', () => {
      let error = validate(
        {
          any: 'object',
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(
        [
          {
            any: 'object',
          },
        ],
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toContain(
        'expected a plain object value, but found [number] instead.'
      );
      expect(error?.message).toContain('expected value of type [array] but got [number]');
    });
  });

  describe('procedure', () => {
    const setup = () => {
      const contentRegistry = new ContentRegistry(new EventBus());
      const storage = createMockedStorage();
      contentRegistry.register({
        id: FOO_CONTENT_ID,
        storage,
        version: {
          latest: 2,
        },
      });

      const requestHandlerContext = 'mockedRequestHandlerContext';
      const ctx: any = {
        contentRegistry,
        requestHandlerContext,
        getTransformsFactory: getServiceObjectTransformFactory,
      };

      return { ctx, storage };
    };

    test('should return the storage bulkGet() result', async () => {
      const { ctx, storage } = setup();

      const expected = ['Item1', 'Item2'];
      storage.bulkGet.mockResolvedValueOnce(expected);

      const result = await fn(ctx, {
        contentTypeId: FOO_CONTENT_ID,
        version: 1,
        ids: ['123', '456'],
      });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        items: expected,
      });

      expect(storage.bulkGet).toHaveBeenCalledWith(
        {
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 1,
            latest: 2, // from the registry
          },
          utils: {
            getTransforms: expect.any(Function),
          },
        },
        ['123', '456'],
        undefined
      );
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() => fn(ctx, { contentTypeId: 'unknown', ids: ['123', '456'] })).rejects.toEqual(
          new Error('Content [unknown] is not registered.')
        );
      });

      test('should throw if the request version is higher than the registered version', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            ids: ['123', '456'],
            version: 7,
          })
        ).rejects.toEqual(new Error('Invalid version. Latest version is [2].'));
      });
    });

    describe('object versioning', () => {
      test('should expose a  utility to transform and validate services objects', () => {
        const { ctx, storage } = setup();
        fn(ctx, { contentTypeId: FOO_CONTENT_ID, ids: ['1234'], version: 1 });
        const [[storageContext]] = storage.bulkGet.mock.calls;

        // getTransforms() utils should be available from context
        const { getTransforms } = storageContext.utils ?? {};
        expect(getTransforms).not.toBeUndefined();

        const definitions: ContentManagementServiceDefinitionVersioned = {
          1: {
            bulkGet: {
              in: {
                options: {
                  schema: schema.object({
                    version1: schema.string(),
                  }),
                  up: (pre: object) => ({ ...pre, version2: 'added' }),
                },
              },
            },
          },
          2: {},
        };

        const transforms = getTransforms(definitions, 1);

        // Some smoke tests for the getTransforms() utils. Complete test suite is inside
        // the package @kbn/object-versioning
        expect(transforms.bulkGet.in.options.up({ version1: 'foo' }).value).toEqual({
          version1: 'foo',
          version2: 'added',
        });

        const optionsUpTransform = transforms.bulkGet.in.options.up({ version1: 123 });

        expect(optionsUpTransform.value).toBe(null);
        expect(optionsUpTransform.error?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );

        expect(transforms.bulkGet.in.options.validate({ version1: 123 })?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );
      });
    });
  });
});
