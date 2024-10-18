import { LabelStudio } from '@humansignal/frontend-test/helpers/LSF';

describe('Labelo UI init', () => {
  it('Initialize empty Labelo', () => {
    LabelStudio.init({
      config: '<View></View>',
      task: {
        annotations: [],
        predictions: [],
        id: 1,
        data: {
          image: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
        },
      },
    });
  });

  it('Initialize Labelo', () => {
    LabelStudio.init({
      config: '<View></View>',
      task: {
        annotations: [{ id: 1, result: [] }],
        predictions: [],
        id: 1,
        data: {
          image: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
        },
      },
    });
  });
});
