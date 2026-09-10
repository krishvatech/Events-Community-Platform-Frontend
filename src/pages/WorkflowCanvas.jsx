import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

const nodeTypeColors = {
  action: "#10B981",
  condition: "#F59E0B",
  decision: "#EF4444",
  trigger: "#3B82F6",
};

function WorkflowNode({ data }) {
  const bgColor = nodeTypeColors[data.eventType?.toLowerCase()] || "#6B7280";

  return (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: bgColor,
        color: "#fff",
        minWidth: 150,
        textAlign: "center",
        border: "2px solid #1B2A4A",
        cursor: "pointer",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
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
    </Paper>
  );
}

export default function WorkflowCanvas({
  events,
  onNodeSelect,
  getConfigurationStatus,
  getEventLabel,
}) {
  const nodes = useMemo(
    () =>
      (events || []).map((event, index) => {
        const status = getConfigurationStatus(event);
        return {
          id: event.id,
          data: {
            label: getEventLabel(event.metadata),
            eventType: event.eventType,
            complete: status.complete,
            statusMessage: status.message,
          },
          position: { x: index * 240, y: 100 },
          type: "default",
        };
      }),
    [events, getConfigurationStatus, getEventLabel]
  );

  const edges = useMemo(() => {
    const edgeList = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edgeList.push({
        id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: true,
      });
    }
    return edgeList;
  }, [nodes]);

  const [nodesState, setNodesState] = useNodesState(nodes);
  const [edgesState, setEdgesState] = useEdgesState(edges);

  useEffect(() => {
    setNodesState(nodes);
  }, [nodes, setNodesState]);

  useEffect(() => {
    setEdgesState(edges);
  }, [edges, setEdgesState]);

  const handleNodeClick = useCallback(
    (_, node) => {
      const eventObj = events?.find((e) => e.id === node.id);
      if (eventObj && onNodeSelect) {
        onNodeSelect(eventObj.id);
      }
    },
    [events, onNodeSelect]
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: 450,
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid #E7ECEF",
      }}
    >
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
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
