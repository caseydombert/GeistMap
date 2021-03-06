
/**
 *
 * AddPictureWindow
 *
 */

import React from 'react';

import './styles.css';

import { withRouter } from 'react-router-dom'
import { FlatButton, Dialog } from 'material-ui'
import { ControlledTextField } from '../Input'
import NodeSearch from '../../containers/NodeSearch'
import { Entity, RichUtils } from 'draft-js';

const ENTITY_TYPE = 'CONTENT_LINK'

const styles = {
    surroundingDiv: {
        margin: "3rem 0",
        borderBottom: "1px solid #cacaca",
        lineHeight: 0,
        textAlign: 'center',
    },
    span: {
        background: "#fff",
        padding: "0 0.5rem"
    },
}
export const OrDivider = (props) => (
    <div style={styles.surroundingDiv}>
        <span style={styles.span}>Or</span>
    </div>
)

import { UploadButton, UploadQRButton } from '../ContentEditor/customPlugins/upload-plugin/index.js'
import { AddMediaInput } from '../ContentEditor/customPlugins/media-plugin/index.js'

// TODO: this redux pattern for modals can be generalized into a HOC - 2016-07-12
class AddPictureWindow extends React.Component {

    constructor(props) {
        super(props);

        this.handleCancel = this.handleCancel.bind(this)

        this.state = {
            active: false, // button active state
            open: false, // state of the modal
        }
    }

    handleCancel() {
        this.props.hideWindow()
    }

    render() {
        const actions = [
            <FlatButton
                label="Cancel"
                primary={true}
                onClick={this.handleCancel}
            />,
        ];

        return (
            <Dialog
                title="Add a photo"
                actions={actions}
                modal={false}
                open={this.props.open}
                onRequestClose={this.handleCancel}
                autoScrollBodyContent={true}
            >
                <div className={"addPictureWindow"}>
                    <h3>From the web</h3>
                    <AddMediaInput
                        editorState={this.props.getEditorState()}
                        setEditorState={this.props.setEditorState}
                        onSuccess={() => this.handleCancel()}
                    />
                    <OrDivider />
                    <h3>Upload a photo</h3>
                    <UploadButton
                        getEditorState={this.props.getEditorState}  
                        setEditorState={this.props.setEditorState}
                        handleUpload={this.props.handleUpload}
                        theme={{
                            div: 'addPictureWindow-uploadDiv',
                            dropzone: 'addPictureWindow-dropzone',
                            dropzoneActive: 'addPictureWindow-dropzoneActive'
                        }}
                        onSuccess={() => this.handleCancel()}
                        accept="image/*"
                    />

                    <OrDivider />
                    <h3>From your phone</h3>
                    <UploadQRButton
                        getEditorState={this.props.getEditorState}  
                        setEditorState={this.props.setEditorState}
                        handleUpload={this.props.handleUpload}
                        onSuccess={() => this.handleCancel()}
                        url="photo"
                    />

                </div>
            </Dialog>
        );
    }
}

export default withRouter(AddPictureWindow);

