import { useState } from "react";
import { Modal, Radio } from "antd";
import { Block, Elem } from "apps/labeloapp/src/utils/bem";

export const MemberDeleteModal = ({ visible, onClose, onSelectDeleteChoice,onOk }) => {
    const [selectedValue, setSelectedValue] = useState(null);

    const handleRadioChange = (e) => {
        setSelectedValue(e.target.value);
        onSelectDeleteChoice(e.target.value); // Pass the selected value to the parent
    };

    return (
        <Modal open={visible} onCancel={onClose} onOk={onOk}>
            <Block>
                <h3 style={{ fontWeight: 'bold' }}>Delete Project Members</h3>
                <Elem>
                    <Radio.Group onChange={handleRadioChange} value={selectedValue}>
                        <Radio value="DELETE_ALL">Delete All</Radio><br/>
                        <Radio value="DELETE_EXCEPT_CONTRIBUTORS">Delete Except Contributors</Radio><br/>
                        <Radio value="DELETE_NONE">Delete None</Radio>
                    </Radio.Group>
                </Elem>
            </Block>
        </Modal>
    );
};
