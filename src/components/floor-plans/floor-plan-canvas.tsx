'use client'

import { useState, useRef, useCallback } from 'react'
import { Stage, Layer, Rect, Circle, Text, Group, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'

interface FloorPlanCanvasProps {
  width: number
  height: number
  tables: FloorPlanTable[]
  backgroundImage?: string
  showGrid?: boolean
  gridSize?: number
  onTableMove: (tableId: string, x: number, y: number) => void
  onTableSelect: (tableId: string | null) => void
  selectedTableId: string | null
}

interface FloorPlanTable {
  id: string
  tableNumber: string
  shape: 'round' | 'rectangle' | 'square'
  x: number
  y: number
  width: number
  height: number
  capacity: number
  assignedCount: number
  fillColor: string
  strokeColor: string
  strokeWidth: number
  isVip: boolean
}

export function FloorPlanCanvas({
  width,
  height,
  tables,
  backgroundImage,
  showGrid = false,
  gridSize = 50,
  onTableMove,
  onTableSelect,
  selectedTableId,
}: FloorPlanCanvasProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const stageRef = useRef<Konva.Stage>(null)

  // Load background image
  const [bgImage] = useImage(backgroundImage || '')

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    const scaleBy = 1.05
    const stage = e.target.getStage()

    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()

    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

    // Limit zoom
    const finalScale = Math.max(0.5, Math.min(3, newScale))

    setScale(finalScale)
    setPosition({
      x: pointer.x - mousePointTo.x * finalScale,
      y: pointer.y - mousePointTo.y * finalScale,
    })
  }, [])

  // Render grid
  const renderGrid = () => {
    if (!showGrid) return null

    const lines = []

    // Vertical lines
    for (let i = 0; i < width / gridSize; i++) {
      lines.push(
        <Rect
          key={`v-${i}`}
          x={i * gridSize}
          y={0}
          width={1}
          height={height}
          fill="#E5E7EB"
        />
      )
    }

    // Horizontal lines
    for (let i = 0; i < height / gridSize; i++) {
      lines.push(
        <Rect
          key={`h-${i}`}
          x={0}
          y={i * gridSize}
          width={width}
          height={1}
          fill="#E5E7EB"
        />
      )
    }

    return lines
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        draggable
        onClick={(e) => {
          // Deselect if clicking on stage
          if (e.target === e.target.getStage()) {
            onTableSelect(null)
          }
        }}
      >
        {/* Background Layer */}
        <Layer>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={width}
              height={height}
              opacity={0.5}
            />
          )}
          {renderGrid()}
        </Layer>

        {/* Tables Layer */}
        <Layer>
          {tables.map((table) => (
            <TableShape
              key={table.id}
              table={table}
              isSelected={selectedTableId === table.id}
              onSelect={() => onTableSelect(table.id)}
              onDragEnd={(x, y) => onTableMove(table.id, x, y)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

// Individual Table Component
interface TableShapeProps {
  table: FloorPlanTable
  isSelected: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
}

function TableShape({ table, isSelected, onSelect, onDragEnd }: TableShapeProps) {
  const shapeRef = useRef<Konva.Group>(null)

  const renderShape = () => {
    switch (table.shape) {
      case 'round':
        return (
          <Circle
            radius={table.width / 2}
            fill={table.fillColor}
            stroke={isSelected ? '#4F46E5' : table.strokeColor}
            strokeWidth={isSelected ? 4 : table.strokeWidth}
          />
        )
      case 'rectangle':
        return (
          <Rect
            width={table.width}
            height={table.height}
            fill={table.fillColor}
            stroke={isSelected ? '#4F46E5' : table.strokeColor}
            strokeWidth={isSelected ? 4 : table.strokeWidth}
            offsetX={table.width / 2}
            offsetY={table.height / 2}
          />
        )
      case 'square':
        return (
          <Rect
            width={table.width}
            height={table.width}
            fill={table.fillColor}
            stroke={isSelected ? '#4F46E5' : table.strokeColor}
            strokeWidth={isSelected ? 4 : table.strokeWidth}
            offsetX={table.width / 2}
            offsetY={table.width / 2}
          />
        )
    }
  }

  const isOverCapacity = table.assignedCount > table.capacity
  const labelColor = isOverCapacity ? '#DC2626' : '#111827'

  return (
    <Group
      ref={shapeRef}
      x={table.x}
      y={table.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y())
      }}
    >
      {renderShape()}

      {/* Table Number */}
      <Text
        text={table.tableNumber}
        fontSize={18}
        fontStyle="bold"
        fill={labelColor}
        align="center"
        verticalAlign="middle"
        offsetX={table.shape === 'round' ? 0 : table.width / 2}
        offsetY={table.shape === 'round' ? 0 : table.height / 2}
        y={table.shape === 'round' ? -8 : 0}
      />

      {/* Occupancy */}
      <Text
        text={`${table.assignedCount}/${table.capacity}`}
        fontSize={12}
        fill={labelColor}
        align="center"
        offsetX={table.shape === 'round' ? 0 : table.width / 2}
        offsetY={table.shape === 'round' ? 0 : table.height / 2}
        y={table.shape === 'round' ? 8 : 20}
      />

      {/* VIP Badge */}
      {table.isVip && (
        <Text
          text="⭐"
          fontSize={16}
          offsetX={table.shape === 'round' ? -20 : table.width / 2 - 20}
          offsetY={table.shape === 'round' ? -20 : table.height / 2 - 20}
        />
      )}
    </Group>
  )
}
