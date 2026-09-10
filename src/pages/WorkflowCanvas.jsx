import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Handle,
  Position,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Button,
} from "@mui/material";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TriggerIcon from "@mui/icons-material/PlayArrowRounded";
import ActionIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ConditionIcon from "@mui/icons-material/HelpOutlineRounded";
import DelayIcon from "@mui/icons-material/TimerOutlined";

const nodeTypeColors = {
  trigger: "#3B82F6",
  action: "#10B981",
  condition: "#F59E0B",
  delay: "#8B5CF6",
  event: "#6B7280",
};

const nodeTypeIcons = {
  trigger: TriggerIcon,
  action: ActionIcon,
  condition: ConditionIcon,
  delay: DelayIcon,
};

function CanvasNode({ data, isConnectable }) {
  const bgColor = nodeTypeColors[data.nodeType?.toLowerCase()] || nodeTypeColors.event;
  const isSelected = data.isSelected;
  const NodeIcon = nodeTypeIcons[data.nodeType?.toLowerCase()];

  return (
    <Paper
      sx={{
        p: 1,
        borderRadius: 1.5,
        bgcolor: bgColor,
        color: "#fff",
        minWidth: 140,
        textAlign: "center",
        border: isSelected ? "3px solid #FFD700" : "2px solid #1B2A4A",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Stack spacing={0.3} alignItems="center">
        {NodeIcon && (
          <NodeIcon sx={{ fontSize: 18 }} />
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
          {data.label}
        </Typography>
        {data.statusMessage && (
          <Chip
            label={data.statusMessage}
            size="small"
            sx={{
              bgcolor: data.complete ? "#4ade80" : "#fca5a5",
              color: "#000",
              fontSize: "0.6rem",
              height: "auto",
            }}
          />
        )}
        {data.onDelete && (
          <Tooltip title="Delete node">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete(data.nodeId);
              }}
              sx={{
                color: "#fff",
                bgcolor: "rgba(0,0,0,0.2)",
                p: 0.25,
                width: 20,
                height: 20,
                "&:hover": { bgcolor: "rgba(0,0,0,0.4)" },
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </Paper>
  );
}

export default function WorkflowCanvas({
  events,
  canvasNodes,
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
  onConnect,
  canvasSettings,
  onDeleteNode,
  onAddNode,
  getConfigurationStatus,
  getEventLabel,
  selectedNodeId,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const initialNodes = useMemo(
    () =>
      (canvasNodes || []).map((node) => {
        const event = node.eventId ? events?.find((e) => e.id === node.eventId) : null;
        const status = event ? getConfigurationStatus(event) : { complete: true, message: "" };
        const label = node.nodeType === "trigger" ? "Trigger" :
                      node.nodeType === "delay" ? "Delay" :
                      node.nodeType === "condition" ? "Condition" :
                      event ? getEventLabel(event.metadata) : node.label || "Node";

        return {
          id: node.id,
          data: {
            label,
            nodeType: node.nodeType,
            nodeId: node.id,
            eventId: node.eventId,
            complete: status.complete,
            statusMessage: event ? status.message : "",
            onDelete: onDeleteNode,
            isSelected: selectedNodeId === node.id,
          },
          position: node.position || { x: Math.random() * 400, y: Math.random() * 300 },
          type: "default",
          draggable: true,
        };
      }),
    [canvasNodes, events, getConfigurationStatus, getEventLabel, onDeleteNode, selectedNodeId]
  );

  const initialEdges = useMemo(
    () => canvasSettings?.edges || [],
    [canvasSettings?.edges]
  );

  const [nodesState, setNodesState] = useNodesState(initialNodes);
  const [edgesState, setEdgesState] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodesState(initialNodes);
  }, [initialNodes, setNodesState]);

  useEffect(() => {
    setEdgesState(initialEdges);
  }, [initialEdges, setEdgesState]);

  const handleNodesChange = useCallback(
    (changes) => {
      setNodesState(changes);
      if (onNodesChange) {
        const updatedNodes = nodesState.map((node) => {
          const changed = changes.find((c) => c.id === node.id);
          if (changed?.position) {
            return { ...node, position: changed.position };
          }
          return node;
        });
        onNodesChange(
          updatedNodes.map((n) => ({
            id: n.id,
            position: n.position,
            data: n.data,
          }))
        );
      }
    },
    [nodesState, setNodesState, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      setEdgesState(changes);
      if (onEdgesChange) {
        onEdgesChange(edgesState);
      }
    },
    [edgesState, setEdgesState, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection) => {
      if (onConnect) {
        setEdgesState((eds) => addEdge(connection, eds));
        onConnect(connection);
      }
    },
    [setEdgesState, onConnect]
  );

  const handleNodeClick = useCallback(
    (_, node) => {
      if (onNodeSelect) {
        onNodeSelect(node.id);
      }
    },
    [onNodeSelect]
  );

  const handleCanvasContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setAnchorEl(e.currentTarget);
    },
    []
  );

  const handleAddNode = (nodeType) => {
    if (onAddNode && menuPosition) {
      const rect = document.querySelector(".react-flow__viewport")?.getBoundingClientRect();
      if (rect) {
        const x = menuPosition.x - rect.left;
        const y = menuPosition.y - rect.top;
        onAddNode(nodeType, { x, y });
      }
    }
    setAnchorEl(null);
    setMenuPosition(null);
  };

  const canvasRef = React.useRef(null);

  return (
    <Box
      ref={canvasRef}
      sx={{
        width: "100%",
        height: 550,
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid #E7ECEF",
      }}
      onContextMenu={handleCanvasContextMenu}
    >
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={{ default: CanvasNode }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <Tooltip title="Right-click canvas to add nodes">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={(e) => {
              setMenuPosition({ x: e.clientX, y: e.clientY });
              setAnchorEl(e.currentTarget);
            }}
            sx={{ textTransform: "none" }}
          >
            Add Node
          </Button>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorPosition={
          menuPosition ? { top: menuPosition.y, left: menuPosition.x } : undefined
        }
        anchorReference="anchorPosition"
      >
        <MenuItem onClick={() => handleAddNode("trigger")}>
          <TriggerIcon sx={{ mr: 1 }} /> Trigger
        </MenuItem>
        <MenuItem onClick={() => handleAddNode("action")}>
          <ActionIcon sx={{ mr: 1 }} /> Action
        </MenuItem>
        <MenuItem onClick={() => handleAddNode("condition")}>
          <ConditionIcon sx={{ mr: 1 }} /> Condition
        </MenuItem>
        <MenuItem onClick={() => handleAddNode("delay")}>
          <DelayIcon sx={{ mr: 1 }} /> Delay
        </MenuItem>
      </Menu>
    </Box>
  );
}
