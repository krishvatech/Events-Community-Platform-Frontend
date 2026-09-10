import React, { useCallback, useEffect, useMemo } from "react";
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
import { Box, Chip, Paper, Stack, Typography, IconButton, Tooltip } from "@mui/material";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

const nodeTypeColors = {
  action: "#10B981",
  condition: "#F59E0B",
  decision: "#EF4444",
  trigger: "#3B82F6",
};

function WorkflowNode({ data, isConnectable }) {
  const bgColor = nodeTypeColors[data.eventType?.toLowerCase()] || "#6B7280";
  const isSelected = data.isSelected;

  return (
    <Paper
      sx={{
        p: 1,
        borderRadius: 1.5,
        bgcolor: bgColor,
        color: "#fff",
        minWidth: 160,
        textAlign: "center",
        border: isSelected ? "3px solid #FFD700" : "2px solid #1B2A4A",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {data.label}
        </Typography>
        <Chip
          label={data.statusMessage}
          size="small"
          sx={{
            bgcolor: data.complete ? "#4ade80" : "#fca5a5",
            color: "#000",
            fontSize: "0.65rem",
            height: "auto",
          }}
        />
        {data.onDelete && (
          <Tooltip title="Delete event">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete(data.eventId);
              }}
              sx={{
                color: "#fff",
                bgcolor: "rgba(0,0,0,0.2)",
                p: 0.5,
                width: 24,
                height: 24,
                alignSelf: "center",
                "&:hover": { bgcolor: "rgba(0,0,0,0.4)" },
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 14 }} />
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
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
  onConnect,
  canvasSettings,
  onDeleteNode,
  getConfigurationStatus,
  getEventLabel,
  selectedNodeId,
}) {
  const initialNodes = useMemo(
    () =>
      (events || []).map((event, index) => {
        const status = getConfigurationStatus(event);
        const savedNode = canvasSettings?.nodes?.find((n) => n.id === event.id);
        return {
          id: event.id,
          data: {
            label: getEventLabel(event.metadata),
            eventType: event.eventType,
            complete: status.complete,
            statusMessage: status.message,
            eventId: event.id,
            onDelete: onDeleteNode,
            isSelected: selectedNodeId === event.id,
          },
          position: savedNode?.position || { x: index * 240, y: 100 },
          type: "default",
          draggable: true,
        };
      }),
    [events, getConfigurationStatus, getEventLabel, canvasSettings, onDeleteNode, selectedNodeId]
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
        onNodesChange(updatedNodes.map((n) => ({ id: n.id, position: n.position })));
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

  return (
    <Box
      sx={{
        width: "100%",
        height: 500,
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid #E7ECEF",
      }}
    >
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={{ default: WorkflowNode }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Box>
  );
}
