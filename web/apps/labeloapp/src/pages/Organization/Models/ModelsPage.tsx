import { Button } from 'apps/labeloapp/src/components';
import { Page } from '../../types/Page';
import { Space } from 'apps/labeloapp/src/components/Space/Space';
import { Block } from 'apps/labeloapp/src/utils/bem';
import { EmptyList } from './@components/EmptyList';

export const ModelsPage: Page = () => {
  return (
    <Block name="prompter">
      <EmptyList/>
    </Block>
  );
};

ModelsPage.title = () => "Models";
ModelsPage.titleRaw = "Models";
ModelsPage.path = "/models";

ModelsPage.context = () => {
  return (
    <Space size="small">
      <Button
        to="/prompt/settings"
        size="compact"
        look="primary"
      >Create Model</Button>
    </Space>
  );
};

