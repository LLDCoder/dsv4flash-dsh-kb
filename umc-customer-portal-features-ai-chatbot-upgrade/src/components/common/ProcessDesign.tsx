import { useEffect, useState } from 'react';
import ProcessTree from '@/components/ProcessTree';
import type { INode, TNodeType } from '@/components/ProcessTree';
import './ProcessDesign.css'
import NodeConfig from '../ProcessTree/NodeConfig';
import { isBranchNode, getRandomId } from '@/components/ProcessTree';
import DraggableCanvas from '../ProcessTree/DraggableCanvas';
interface IBpmnNodes{
    id: string;
    type: 'startEvent' | 'exclusiveGateway' | 'parallelGateway' | 'intermediateCatchEvent' | 'userTask' | 'serviceTask' | 'endEvent';
    name: string;
}
interface IShapes{
    id: string;
    elementId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
interface ISequenceFlow{
    id: string;
    sourceRef: string;
    targetRef: string;
}
interface IEdges{
    id: string;
    bpmnElement: string;
    waypoints: {
        x: number;
        y: number;
    }[]
}
export function getRandomFlowId(){
    return `Flow_${new Date().getTime().toString().substring(5)}${Math.round(Math.random()*9000+1000)}`
}
export default function ProcessDesign() {
    const [process, setProcess] = useState<INode>(() : INode => {
        const rootId = getRandomId();
        return {
            id: rootId,
            parentId: null,
            type: "ROOT",
            name: "Initiator",
            desc: "Anyone",
            props: {
                assignedUser: [],
                formPerms: []
            },
            children: {
                id: getRandomId(),
                parentId: rootId,
                type: "PROCESSEND",
            }
        }
    });
    const [selectedNode, setSelectedNode] = useState<INode | null>(null);
    
    function onProcessChange(newProcess: INode){
        setProcess(newProcess);
    }
    function getBpmnType(processType: TNodeType){
        switch(processType){
            case 'ROOT':
                return 'startEvent';
            case 'APPROVAL':
            case 'CC':
                return 'userTask';
            case 'CONDITION':
                return 'exclusiveGateway';
            case 'CONCURRENT':
                return 'parallelGateway';
            case 'DELAY':
                return 'intermediateCatchEvent';
            case 'TRIGGER':
                return 'serviceTask';
            case 'PROCESSEND':
                return 'endEvent';

        }
    }
    function getNodePropsByType(type: IBpmnNodes['type']){
        const nodeProps: any = {
            'startEvent': {
                formKey: "start-form",
                formFields: [
                    {
                        "id": "orderId",
                        "type": "string",
                        "label": "Order ID",
                        "required": true
                    },
                    {
                        "id": "amount",
                        "type": "long",
                        "label": "Order Amount",
                        "required": true
                    }
                ]
            },
            'userTask': {
                assignee: "${initiator}",
                candidateGroups: "sales",
                formKey: "sales-review-form",
                dueDate: "P3D",
                priority: 50,
                taskListeners: [
                    {
                        "event": "create",
                        "class": "com.example.SalesTaskCreateListener"
                    },
                    {
                        "event": "complete",
                        "expression": "${taskService.afterSalesReview(execution)}"
                    }
                ]
            },
            'exclusiveGateway': {
                gatewayDirection: "Diverging"
            },
            'serviceTask': {
                implementationType: "class",
                implementation: "com.example.ProcessApprovalService",
                fields: [
                    {
                        "name": "notificationEnabled",
                        "stringValue": "true"
                    }
                ]
            },
            'parallelGateway': {
               
            },
            'intermediateCatchEvent': {
                
            },
        }
        return nodeProps[type];
    }
    const bpmnx = 400;
    function getShapesByType(type: IBpmnNodes['type'], y: number){
        switch(type){
            case "startEvent":
                return {
                    x: bpmnx,
                    y: 0,
                    width: 36,
                    height: 36,
                }
            case "userTask":
                return {
                    x: bpmnx - 50 + 18,
                    y: y,
                    width: 100,
                    height: 80,
                }
            case "endEvent":
                return {
                    x: bpmnx,
                    y: y,
                    width: 36,
                    height: 36,
                }
            default:
                return { x:0, y:0, width: 0, height: 0}
        }
    }
    function getWaypoints(prevY: number, type: IBpmnNodes['type'], shape: IShapes){
        const { x, y, width, height } = shape;
        const { x: cx, y: cy, width: cwidth } = getShapesByType(type, prevY + 50)
        return [
            { x: x + width / 2, y: y + height },
            { x: cx + cwidth / 2, y: cy }
        ]
    }
    function getBpmnNodes(y: number,process: INode, nodes: IBpmnNodes[] = [], shapes: IShapes[] = [], sequenceFlows: ISequenceFlow[] = [], edges: IEdges[] = []){
        const nodeType = getBpmnType(process.type!);
        if(!nodeType){
            return ;
        }
        if(process.type === 'PROCESSEND'){
            nodes.push({
                id: process.id!,
                type: 'endEvent',
                name: 'Process End',
            });
            shapes.push({
                id: 'Shape_' + process.id!,
                elementId: process.id!,
                ...getShapesByType(nodeType, y)
            });
            return ;
        }
        if(process.type === 'EMPTY'){
            if(process.children && Object.keys(process.children).length > 0){
                getBpmnNodes(y,process.children, nodes, shapes, sequenceFlows);
            }
        }else {
            const nodeProps = getNodePropsByType(nodeType);
            nodes.push({
                id: process.id!,
                type: nodeType,
                name: process.name!,
                ...nodeProps
            });
            const shape = {
                id: 'Shape_' + process.id!,
                elementId: process.id!,
                ...getShapesByType(nodeType, y)
            }
            y = shape.y + shape.height;
            shapes.push(shape);
           
            if(isBranchNode(process)){
                process?.branchs?.forEach(item=>{
                     sequenceFlows.push({
                        id: getRandomFlowId(),
                        sourceRef: process.id!,
                        targetRef: item.id!,
                    });
                    getBpmnNodes(y + 50, item, nodes, shapes, sequenceFlows)
                })
            } else {
                if(process.children && Object.keys(process.children).length > 0){
                    const flowId = getRandomFlowId();
                    sequenceFlows.push({
                        id: flowId,
                        sourceRef: process.id!,
                        targetRef: process.children?.id!,
                    });
                     const waypoints = getWaypoints(y,getBpmnType(process.children.type!)!, shape);
                    edges.push({
                        id: "Edge_" + flowId,
                        bpmnElement: flowId,
                        waypoints: waypoints
                    });
                    getBpmnNodes(y + 50,process.children, nodes, shapes, sequenceFlows, edges);
                }
            }
        }
        
    }
    function getBpmnJson(){
        const nodes: IBpmnNodes[] = [];
        const shapes: IShapes[] = [];
        const sequenceFlows: ISequenceFlow[] = [];
        const edges: IEdges[] = [];
        getBpmnNodes(0, process, nodes, shapes, sequenceFlows, edges)
        return {
            "definitions": {
                "id": "Definitions_1",
                "name": "Order Approval Process",
                "targetNamespace": "http://camunda.org/schema/1.0/bpmn",
                "process": {
                    "id": "Process_1",
                    "name": "Order Approval Process",
                    "isExecutable": true,
                    "candidateStarterGroups": "sales,manager",
                    "documentation": "Order Approval Business Process",
                    "dataObjects": [
                        {
                            "id": "DataObject_1",
                            "name": "Order Data",
                            "dataType": "Map",
                            "value": "{}"
                        },
                        {
                            "id": "DataObject_2",
                            "name": "Approval Result",
                            "dataType": "String",
                            "value": "pending"
                        }
                    ],
                    "lanes": [
                        {
                            "id": "Lane_1",
                            "name": "Sales Department",
                            "candidateGroups": "sales",
                            "nodes": [ "StartEvent_1", "UserTask_1", "UserTask_3" ]
                        },
                        {
                            "id": "Lane_2",
                            "name": "Management Department",
                            "candidateGroups": "manager",
                            "nodes": [ "UserTask_2", "ServiceTask_1" ]
                        }
                    ],
                    "nodes": nodes,
                    "sequenceFlows": sequenceFlows,
                    "messages": [
                        {
                            "id": "Message_1",
                            "name": "Order Approval Message"
                        }
                    ],
                    "signals": [
                        {
                            "id": "Signal_1",
                            "name": "Approval Timeout Signal"
                        }
                    ]
                },
                "diagram": {
                    "id": "BPMNDiagram_1",
                    "plane": {
                        "id": "BPMNPlane_1",
                        "shapes": shapes,
                        "edges": edges,
                    }
                }
            }
        }
    }
    
    return (
        <div className='process-design'>
            <div className='design-wrapper'>
                <DraggableCanvas>
                    <div className='designer'>
                        <ProcessTree selectedNode={selectedNode} process={process} onProcessChange={onProcessChange} onSelected={(node)=>{
                            setSelectedNode(node);  
                        }} />
                    </div>
                </DraggableCanvas>
            </div>
            <div className='node-properties-configration'>
                <NodeConfig
                    process={process}
                    onProceessChange={onProcessChange}
                    selectNode={selectedNode} />
            </div>
        </div>
    )
}