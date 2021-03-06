
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import ReactDOM from 'react-dom'
import classNames from 'classnames'
import { drag as d3Drag } from 'd3-drag'
import { select as d3Select } from 'd3-selection'
import { event as currentEvent, mouse as currentMouse } from 'd3-selection';
import { scaleLinear } from 'd3-scale'
import { tree as d3Tree, hierarchy as d3Hierarchy } from 'd3-hierarchy'

import {
    forceSimulation,
    forceX,
    forceY,
    forceManyBody,
    forceLink,
    forceCenter
} from 'd3-force'

import createZoom from '../zoom'
import {
    MIN_NODE_RADIUS,
    MAX_NODE_RADIUS,
    NODE_RADIUS,
    WIDTH,
    HEIGHT,
} from '../constants'

import ZoomButtons from '../ZoomButtons'

import HierarchyGraph from '../HierarchyGraph'
import {
    createInnerDrag
} from './drag'

import { dragElement, showAddNodeWindow } from '../../../actions/ui'

import './styles.scss'

import ToggleShowLinks from '../../ToggleShowLinks'


class NodeOutside extends React.Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        const selection = d3Select(`#node-${this.props.node.data.id}`)
        this.props.drag(selection)
    }

    render() {
        const { node, draggedElement } = this.props

        const x = draggedElement.id === node.data.id ? draggedElement.x : node.x;
        const y = draggedElement.id === node.data.id ? draggedElement.y : node.y;

        const transform = `translate(${y}, ${x})`;

        return (
            <g
                id={`node-${node.data.id}`}
                className="node node-outside"
                transform={transform}
                onClick={() => this.props.onClick(node.data.id)}
            >
                <circle
                    className="nodeCircle"
                    r={node.radius}
                    fill={ node.children ? "lightsteelblue" : "#fff" }
                />
                <text
                    className="nodeText"
                    x={node.children ? -10 : 10}
                    textAnchor={ node.children ? "end" : "start" }
                >{node.data.name}</text>
            </g>
        )
    }
}

NodeOutside = connect(
    (state) => ({ draggedElement: state.graphUiState.draggedElement }),
    { dragElement }
)(NodeOutside)

class LinkOutside extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        const { link, draggedElement } = this.props

        // for moving with dragged element
        const sourceX = draggedElement.id === link.source.data.id ? draggedElement.x : link.source.x;
        const sourceY = draggedElement.id === link.source.data.id ? draggedElement.y : link.source.y;
        const targetX = draggedElement.id === link.target.data.id ? draggedElement.x : link.target.x;
        const targetY = draggedElement.id === link.target.data.id ? draggedElement.y : link.target.y;

        const startingPoint = `M ${sourceY}, ${sourceX}`

        const path = link.source.depth === link.target.depth ? 
            [ startingPoint,
                'A',
                (sourceX - targetX) / 2,
                // 50,
                (sourceX - targetX) / 2,
                0,
                0,
                sourceX < targetX ? 1 : 0,
                targetY,
                targetX
            ].join(' ')
            :
            // [
            //     startingPoint,
            //     'L',
            //     targetY,
            //     targetX
            // ].join(' ')
            [
                startingPoint,
                "C",
                (sourceY + targetY) / 2,
                sourceX,
                (sourceY + targetY) / 2,
                targetX,
                targetY,
                targetX
            ].join(' ')

        return (
            <path 
                className="link"
                d={ path }
            />
        )
    }
}
LinkOutside = connect(
    (state) => ({ draggedElement: state.graphUiState.draggedElement }),
    { dragElement }
)(LinkOutside)


class ManipulationLayer extends React.PureComponent {
    constructor(props) {
        super(props)

        this.zoomed = this.zoomed.bind(this)

        this.state = {
            containerTransform: `translate(${WIDTH/2}, ${HEIGHT/2})`
        }
    }

    componentDidMount() {
        const domNode = ReactDOM.findDOMNode(this.refs.graph)
        this.graph = d3Select(domNode);
        this.container = d3Select(ReactDOM.findDOMNode(this.refs.container));

        this.zoom = createZoom(this.graph, this.container, WIDTH, HEIGHT, this.zoomed)

        this.zoom.zoomFit(false)
    }

    componentDidUpdate() {
        this.zoom.zoomFit()
    }

    zoomed(transform) {
        this.setState({
            containerTransform: transform
        })
    }

    render() {
        return (
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                className="svg-content explore-graph"
                ref="graph"
            >
                <g ref="container" transform={this.state.containerTransform}>
                    { this.props.children }
                </g>
            </svg>
        )
    }
}

const iterations = 500;
const edgeStrength = 0.4;
const distanceMax = Infinity;

class ExploreGraph extends React.Component {

    constructor(props) {
        super(props)

        this.onNodeClick = this.onNodeClick.bind(this);

        this.simulation = forceSimulation()
            .velocityDecay(0.6)
            .force(
                "charge", 
                forceManyBody()
                    .distanceMax(distanceMax)
                    .strength(-500)
                    // .strength(-25 * nodeSizeAccessor(d))
            )
            .force("x", forceX().strength(-0.02))
            .force("y", forceY().strength(-0.02))
        // .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
            .force("link",
                forceLink()
                .id(d => d.id)
                // .distance(d => 50 + d.source.radius + d.target.radius)
                .distance(d => 50)
                .strength(
                    d => (d.weight ? d.weight * edgeStrength : edgeStrength)
                )
            )

        this.simulation.stop()

        const innerDragEvents = createInnerDrag(this)({
            // connect: onConnect,
            moveToAbstraction: this.props.moveToAbstraction,
        })

        this.drag = d3Drag()
            .on('drag', innerDragEvents.drag)
            .on('start', innerDragEvents.dragstart)
            .on('end', innerDragEvents.dragend)


        function moveElement(evt){
            dx = evt.clientX - currentX;
            dy = evt.clientY - currentY;
            currentMatrix[4] += dx;
            currentMatrix[5] += dy;
            newMatrix = "matrix(" + currentMatrix.join(' ') + ")";

            selectedElement.setAttributeNS(null, "transform", newMatrix);
            currentX = evt.clientX;
            currentY = evt.clientY;
        }

        this.state = { }
    }

    shouldComponentUpdate(nextProps) {
        if (nextProps.isLoading) {
            return false;
        }

        return true;
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            // TODO: solve this differently, this sucks - 2018-02-03
            this.setState({ rerender: true })
        }
    }

    onNodeClick(id) {
        return this.props.history.push({
            pathname: `/app/nodes/${id}/graph`,
            search: this.props.location.search
        })
    }


    render() {
        // TODO: set the nodes and links here instead of in the graph - 2018-01-29

        const {
            // nodesBelowAbstraction,
            edgesBelowAbstraction,
            nodesWithAbstraction, // nodes both in and outside the abstraction
            edgesOutsideAbstraction,
            nodeTree,
            showLinks,
            focusNode,
        } = this.props

        let { nodesOutsideAbstraction } = this.props

        const {
            rerender
        } = this.state

        const tree = d3Tree()
        tree.nodeSize([25, 100])
        const treeData = tree(d3Hierarchy(nodeTree))

        const nodesBelowAbstraction = treeData.descendants()
        // make sure the data is under a data key
        nodesOutsideAbstraction = nodesOutsideAbstraction
            .map(node => ({
                data: { ...node }
            }))

        const nodesBelowAbstractionMap = _.keyBy(nodesBelowAbstraction, 'data.id')
        const hierarchyLinks = nodesBelowAbstraction.slice(1)

        let nodesById = {}
        nodesBelowAbstraction.forEach(node => {
            node.fx = node.x;
            node.fy = node.y;
            node.radius = 6;

            nodesById[node.data.id] = node
        })


        nodesOutsideAbstraction
            .forEach(node => {
                node.radius = 6;

                nodesById[node.data.id] = node
            })

        edgesOutsideAbstraction.forEach(link => {
            link.source = nodesById[link.start]
            link.target = nodesById[link.end]

            // link.opacity = strokeScale(link.count || 0)
        })

        this.nodesById = nodesById

        this.simulation.nodes([...nodesBelowAbstraction, ...nodesOutsideAbstraction])
        this.simulation.force("link").links(edgesOutsideAbstraction)

        if (this.simulation.alpha() < 0.1) {
            this.simulation.alpha(1)
        }

        // do the work before rendering
        if (this.state.rerender) {
            for (let i = 0; i < iterations; ++i) this.simulation.tick()
        }

        // console.log(nodesOutsideAbstraction, edgesOutsideAbstraction)

        const nodeOutsideElements = nodesOutsideAbstraction.map(node => (
            <NodeOutside
                key={node.data.id}
                node={node}
                drag={this.drag}
                onClick={this.onNodeClick}
            />
        ))

        const edgeOutsideElements = edgesOutsideAbstraction.map(link => (
            <LinkOutside
                key={link.id}
                link={link}
            />
        ))

        console.log("should render only once")

        return (
            <div>
                <ZoomButtons
                    zoomIn={() => this.zoom.zoomIn()}
                    zoomOut={() => this.zoom.zoomOut()}
                    zoomFit={() => this.zoom.zoomFit()}
                />
                <ToggleShowLinks />
                <ManipulationLayer { ...this.props }>
                    { showLinks ? edgeOutsideElements : null }
                    { showLinks ? nodeOutsideElements : null }
                    <HierarchyGraph
                        treeData={treeData}
                        nodes={nodesBelowAbstraction}
                        links={edgesBelowAbstraction}
                        hierarchyLinks={hierarchyLinks}
                        isLoading={this.props.isLoading}
                        showLinks={showLinks}
                        onNodeClick={this.onNodeClick}
                        drag={this.drag}
                        showAddNodeWindow={this.props.showAddNodeWindow}
                    />
                </ManipulationLayer>
            </div>
        )
    }
}

export default connect(
    null,
    { dragElement, showAddNodeWindow },
)(withRouter(ExploreGraph))


