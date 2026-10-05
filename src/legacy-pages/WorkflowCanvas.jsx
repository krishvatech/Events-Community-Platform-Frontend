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
  applyNodeChanges,
  applyEdgeChanges,
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
import DecisionIcon from "@mui/icons-material/CallSplitRounded";
import DelayIcon from "@mui/icons-material/TimerOutlined";
import { isBranchingNodeType, isBranchPath, timingLabel } from "./mauticCampaignGraph";

const nodeTypeColors = {
  trigger: "#3B82F6",
  action: "#10B981",
  condition: "#F59E0B",
  decision: "#EA580C",
  delay: "#8B5CF6",
  event: "#6B7280",
};

const nodeTypeIcons = {
  trigger: TriggerIcon,
  action: ActionIcon,
  condition: ConditionIcon,
  decision: DecisionIcon,
  delay: DelayIcon,
};

const nodeTypeLabels = {
  trigger: "Trigger",
  action: "Action",
  condition: "Condition",
  decision: "Decision",
  delay: "Delay",
};

// The two outputs of a Condition or Decision. The handle id is the Mautic
// decisionPath the connection stands for.
const BRANCH_HANDLES = [
  { id: "yes", label: "YES", color: "#16A34A", top: "35%" },
  { id: "no", label: "NO", color: "#DC2626", top: "70%" },
];

const edgeAppearance = (edge) => {
  const branch = BRANCH_HANDLES.find((handle) => handle.id === edge.sourceHandle);
  return branch
    ? { ...edge, label: branch.label, style: { stroke: branch.color }, labelStyle: { fill: branch.color, fontWeight: 700 } }
    : edge;
};

function CanvasNode({ data, isConnectable }) {
  const accent = nodeTypeColors[data.nodeType?.toLowerCase()] || nodeTypeColors.event;
  const NodeIcon = nodeTypeIcons[data.nodeType?.toLowerCase()];

  return (
    <Paper
      elevation={data.isSelected ? 6 : 1}
      sx={{
        position: "relative",
        borderRadius: "var(--imaa-radius-card)",
        overflow: "hidden",
        width: 200,
        bgcolor: "var(--imaa-dm-surface, #fff)",
        border: data.isSelected ? "2px solid var(--imaa-dm-text, #1B2A4A)" : "1px solid var(--imaa-dm-border, #E7ECEF)",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />

      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ bgcolor: accent, color: "#fff", px: 1, py: 0.5 }}
      >
        {NodeIcon && <NodeIcon sx={{ fontSize: 16 }} />}
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", flex: 1 }}
        >
          {data.typeLabel}
        </Typography>
        {data.onDelete && (
          <Tooltip title="Delete node">
            <IconButton
              size="small"
              aria-label={`Delete ${data.eventName || data.typeLabel} node`}
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete(data.nodeId);
              }}
              sx={{
                color: "#fff",
                p: 0.5,
                width: 32,
                height: 32,
                "&:hover": { bgcolor: "rgba(0,0,0,0.25)" },
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Stack spacing={0.5} sx={{ px: 1, py: 0.85 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 750, color: "var(--imaa-dm-text, #1B2A4A)", lineHeight: 1.25, overflowWrap: "anywhere" }}
        >
          {data.eventName}
        </Typography>
        {data.eventKey && (
          <Typography
            component="code"
            variant="caption"
            sx={{ color: "text.secondary", wordBreak: "break-all" }}
          >
            {data.eventKey}
          </Typography>
        )}
        {data.statusMessage && (
          <Chip
            label={data.statusMessage}
            size="small"
            color={data.complete ? "success" : "error"}
            variant={data.complete ? "filled" : "outlined"}
            sx={{ alignSelf: "flex-start", fontSize: "0.65rem", height: 20 }}
          />
        )}
      </Stack>

      {data.timingLabel && (
        <Typography variant="caption" sx={{ display: "block", px: 1, pb: 0.75, color: "var(--imaa-dm-purple-text, #7C3AED)" }}>
          {data.timingLabel}
        </Typography>
      )}

      {isBranchingNodeType(data.nodeType) ? (
        <>
          {BRANCH_HANDLES.map((handle) => (
            <React.Fragment key={handle.id}>
              <Handle
                type="source"
                id={handle.id}
                position={Position.Right}
                isConnectable={isConnectable}
                style={{ top: handle.top, background: handle.color, width: 10, height: 10 }}
              />
              <Typography
                variant="caption"
                sx={{ position: "absolute", right: 8, top: handle.top, transform: "translateY(-50%)", fontWeight: 800, color: handle.color, fontSize: "0.6rem" }}
              >
                {handle.label}
              </Typography>
            </React.Fragment>
          ))}
          {/* Shows a saved connection with no YES/NO path; it cannot be drawn. */}
          <Handle type="source" position={Position.Bottom} isConnectable={false} style={{ background: "#9CA3AF" }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
      )}
    </Paper>
  );
}

const nodeTypes = { default: CanvasNode };

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
      (canvasNodes || [])
        .filter((node) => node && node.id)
        .map((node, idx) => {
          const event = node.eventId ? events?.find((e) => e.id === node.eventId) : null;
          const status = event ? getConfigurationStatus(event) : null;
          const typeLabel = nodeTypeLabels[node.nodeType] || "Node";
          const eventName = event
            ? getEventLabel(event.metadata)
            : node.nodeType === "trigger"
            ? "Campaign Entry"
            : "No event linked";

          const validPosition =
            node.position &&
            Number.isFinite(node.position.x) &&
            Number.isFinite(node.position.y)
              ? node.position
              : { x: 60 + idx * 260, y: 120 };

          return {
            id: node.id,
            data: {
              label: eventName,
              typeLabel,
              eventName,
              eventKey: event?.key || "",
              nodeType: node.nodeType,
              timingLabel: event ? timingLabel(event) : "",
              nodeId: node.id,
              eventId: node.eventId,
              complete: status ? status.complete : true,
              statusMessage: status ? status.message : "",
              onDelete: onDeleteNode,
              isSelected: selectedNodeId === node.id,
            },
            position: validPosition,
            type: "default",
            draggable: true,
          };
        }),
    [canvasNodes, events, getConfigurationStatus, getEventLabel, onDeleteNode, selectedNodeId]
  );

  const initialEdges = useMemo(
    () =>
      (canvasSettings?.edges || [])
        .filter((e) => e && e.source && e.target)
        .map((e) => edgeAppearance({ ...e, sourceHandle: isBranchPath(e.sourceHandle) ? e.sourceHandle : null })),
    [canvasSettings?.edges]
  );

  const [nodesState, setNodesState] = useNodesState(initialNodes);
  const [edgesState, setEdgesState] = useEdgesState(initialEdges);

  // initialNodes is a fresh array every parent render, so bail out when nothing
  // structural actually changed — otherwise this effect loops with the parent.
  useEffect(() => {
    setNodesState((current) => {
      const unchanged =
        current.length === initialNodes.length &&
        current.every((node, index) => {
          const next = initialNodes[index];
          return (
            next &&
            node.id === next.id &&
            node.position.x === next.position.x &&
            node.position.y === next.position.y &&
            node.data.eventName === next.data.eventName &&
            node.data.eventKey === next.data.eventKey &&
            node.data.nodeType === next.data.nodeType &&
            node.data.timingLabel === next.data.timingLabel &&
            node.data.isSelected === next.data.isSelected &&
            node.data.complete === next.data.complete &&
            node.data.statusMessage === next.data.statusMessage
          );
        });
      return unchanged ? current : initialNodes;
    });
  }, [initialNodes, setNodesState]);

  useEffect(() => {
    setEdgesState(initialEdges);
  }, [initialEdges, setEdgesState]);

  const handleNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, nodesState);
      setNodesState(updated);

      const isPersistable = changes.some(
        (change) =>
          (change.type === "position" && change.dragging === false) ||
          change.type === "remove"
      );
      if (isPersistable && onNodesChange) {
        onNodesChange(updated);
      }
    },
    [nodesState, setNodesState, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, edgesState);
      setEdgesState(updated);

      if (changes.some((change) => change.type === "remove") && onEdgesChange) {
        onEdgesChange(updated);
      }
    },
    [edgesState, setEdgesState, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection) => {
      if (onConnect) {
        setEdgesState((eds) => addEdge(edgeAppearance(connection), eds));
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
      if (e.target.closest(".react-flow")) {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        const tempAnchorEl = document.createElement("div");
        tempAnchorEl.style.position = "absolute";
        tempAnchorEl.style.left = `${e.clientX}px`;
        tempAnchorEl.style.top = `${e.clientY}px`;
        setAnchorEl(tempAnchorEl);
      }
    },
    []
  );

  const handleAddNode = (nodeType) => {
    if (onAddNode) {
      let position = { x: 250, y: 250 };

      if (menuPosition) {
        const pane = document.querySelector(".react-flow__pane");
        if (pane) {
          const paneRect = pane.getBoundingClientRect();
          const x = menuPosition.x - paneRect.left;
          const y = menuPosition.y - paneRect.top;

          if (Number.isFinite(x) && Number.isFinite(y)) {
            position = { x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)) };
          }
        }
      }

      onAddNode(nodeType, position);
    }
    setAnchorEl(null);
    setMenuPosition(null);
  };

  const canvasRef = React.useRef(null);

  return (
    <Box
      ref={canvasRef}
      component="section"
      aria-label="Campaign workflow canvas"
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        height: { xs: 480, sm: 550 },
        position: "relative",
        borderRadius: "var(--imaa-radius-card)",
        overflow: "hidden",
        border: "1px solid var(--imaa-dm-border, #E7ECEF)",
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
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        {nodesState.length === 0 && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
              zIndex: 5,
              width: "100%",
              maxWidth: 360,
              px: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              No nodes yet. Right-click or use "Add Node" button to start building.
            </Typography>
          </Box>
        )}
      </ReactFlow>

      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <Tooltip title="Right-click canvas or click here to add nodes">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={(e) => {
              const canvasBox = canvasRef.current?.getBoundingClientRect();
              if (canvasBox) {
                setMenuPosition({
                  x: canvasBox.left + canvasBox.width / 2,
                  y: canvasBox.top + canvasBox.height / 2,
                });
              }
              setAnchorEl(e.currentTarget);
            }}
            sx={{ minHeight: 40, borderRadius: "var(--imaa-radius-field)", textTransform: "none" }}
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
        MenuListProps={{ "aria-label": "Add workflow node" }}
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
        <MenuItem onClick={() => handleAddNode("decision")}>
          <DecisionIcon sx={{ mr: 1 }} /> Decision
        </MenuItem>
        <MenuItem onClick={() => handleAddNode("delay")}>
          <DelayIcon sx={{ mr: 1 }} /> Delay
        </MenuItem>
      </Menu>
    </Box>
  );
}
