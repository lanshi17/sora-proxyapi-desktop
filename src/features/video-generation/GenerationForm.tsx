import { Form, Input, Select, Checkbox, Button, Card, Space } from 'antd';
import { GenerationParams, defaultGenerationParams } from './generation-schema';

const { TextArea } = Input;

const SECONDS_OPTIONS = [
  { label: '4s', value: 4 },
  { label: '8s', value: 8 },
  { label: '12s', value: 12 }
];

const SIZE_OPTIONS = [
  { label: '720x1280 (Portrait)', value: '720x1280' },
  { label: '1280x720 (Landscape)', value: '1280x720' },
  { label: '1024x1792 (Portrait Pro)', value: '1024x1792' },
  { label: '1792x1024 (Landscape Pro)', value: '1792x1024' }
];

const STYLE_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Thanksgiving', value: 'thanksgiving' },
  { label: 'Comic', value: 'comic' },
  { label: 'News', value: 'news' },
  { label: 'Selfie', value: 'selfie' },
  { label: 'Nostalgic', value: 'nostalgic' },
  { label: 'Anime', value: 'anime' }
];

interface GenerationFormProps {
  onSubmit: (params: GenerationParams) => void;
  model: string;
}

function isAllModel(model: string): boolean {
  return model?.endsWith('-all') ?? false;
}

export function GenerationForm({ onSubmit, model = '' }: GenerationFormProps) {
  const [form] = Form.useForm();
  const showAllParams = isAllModel(model);

  const handleSubmit = (values: GenerationParams) => {
    onSubmit(values);
  };

  return (
    <Card title="Create Video" variant="outlined">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={defaultGenerationParams}
      >
        <Form.Item
          label="Prompt"
          name="prompt"
          rules={[{ required: true, message: 'Please enter a prompt' }]}
        >
          <TextArea
            rows={4}
            placeholder="Describe your video..."
          />
        </Form.Item>

        <Space size="large" wrap>
          <Form.Item label="Size" name="size">
            <Select options={SIZE_OPTIONS} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item label="Duration" name="seconds">
            <Select options={SECONDS_OPTIONS} style={{ width: 120 }} />
          </Form.Item>

          {showAllParams && (
            <Form.Item label="Style (Optional)" name="style">
              <Select options={STYLE_OPTIONS} style={{ width: 150 }} allowClear />
            </Form.Item>
          )}
        </Space>

        {showAllParams && (
          <Form.Item>
            <Space>
              <Form.Item name="watermark" valuePropName="checked" noStyle>
                <Checkbox>Include Watermark</Checkbox>
              </Form.Item>
              
              <Form.Item name="private" valuePropName="checked" noStyle>
                <Checkbox>Private Generation</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            Start Generation
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
