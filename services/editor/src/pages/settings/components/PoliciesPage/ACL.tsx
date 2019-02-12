import React, {useState} from 'react';
import MonacoEditor from 'react-monaco-editor';
import { tweekManagementClient } from '../../../../utils/tweekClients';
import SaveButton from '../../../../components/common/SaveButton/SaveButton';
import { useRemoteState, useErrorNotifier } from "./utils"

const monacoOptions = {
    autoIndent: true,
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true,
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
  };

const isValidJsonArray = (data:string) =>{
    try{
        const result = JSON.parse(data);
        return Array.isArray(result);
    }
    catch (ex){
        return false;
    }
}

export default function(){
  const [policies, setPolicies, remote] = useRemoteState(()=> tweekManagementClient.getPolicies().then(x=>JSON.stringify(x, null, 4) ), 
                                                              (policies)=> tweekManagementClient.savePolicies(JSON.parse(policies)) );
  const [isValid, setIsValid] = useState(true);
  useErrorNotifier( remote.loadingState === "idle" ? remote.error : null, "Error saving policies")

  if (remote.loadingState === "loading") return null;
  if (remote.error && remote.loadingState === "error"){
      return <div>Error: {remote.error.message}</div>
  }

  return <>
    <SaveButton isValid={isValid} isSaving={remote.loadingState === "saving"} hasChanges={remote.isDirty} onClick={()=>remote.save()} />
    <MonacoEditor
          language="json"
          value={policies}
          options={monacoOptions}
          onChange={(newSource:string) => {
            setIsValid(isValidJsonArray(newSource))
            setPolicies(newSource)
          }} />
    </>
         
}