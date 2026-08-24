import { Component, createEffect, createSignal, JSX, on } from 'solid-js'
import { Grid } from './grid/Grid.jsx'
import { CageContext, CageData } from './contexts/CageContext.js'
import { createStore } from 'solid-js/store'
import { Sidebar } from './sidebar/Sidebar.jsx'
import { SidebarContext } from './contexts/SidebarContext.js'
import { SensorData } from '../types/SensorData.js'
import { CreateSensorButton } from './sensors/CreateSensorButton.jsx'
import { CreateLaunchMissileButton } from './sensors/CreateLaunchMissileButton.jsx'
import { SensorsContext } from './contexts/SensorsContext.js'
import { CageSettingsButton } from './cage/CageSettingsButton.jsx'
import { ClearSensorsButton } from './sensors/ClearSensorsButton.jsx'
import { CoordinatorConnectionButton } from './coordinator/CoordinatorConnectionButton.jsx'
import { QuitConfirmation } from './QuitConfirmation.jsx'
import { QuitButton } from './QuitButton.jsx'
import { DragShield } from './DragShield.jsx'
import { DragContext } from './contexts/DragContext.js'

// this is the top level component of the renderer. It is inserted into the root element
// (a div inside <body>)
export const App: Component<Record<string, never>> = () => {
  // the grid requires being provided cage context information.
  // in the future, this may not be a static value, but set in a
  // configuration menu
  const [cage, setCage] = createStore<CageData>({
    length: 30,
    width: 15,
    labels: [
      ['C', 'F', 'I'],
      ['B', 'E', 'H'],
      ['A', 'D', 'G'],
    ],
    rowCount: 0,
    columnCount: 0,
  })

  async function loadCage() {
    const loadedCage = await window.electronAPI.loadCageConfiguration()
    setCage((prev) => loadedCage ?? prev)
  }
  loadCage()

  let closeAppConfirmRef: undefined | HTMLDialogElement
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
      closeAppConfirmRef?.showModal()
    }
  })

  // keep derived context data up to date
  createEffect(() => setCage('rowCount', cage.labels.length))
  createEffect(() =>
    setCage(
      'columnCount',
      cage.labels.reduce(
        (mostColumns, currentRow) =>
          mostColumns > currentRow.length ? mostColumns : currentRow.length,
        0,
      ),
    ),
  )

  // the content of the sidebar
  const [sidebar, setSidebar] = createSignal<JSX.Element>(<></>)

  let cleanupSidebar: () => unknown = () => {}
  function setSidebarContent(
    newElement?: JSX.Element,
    cleanup?: () => unknown,
  ) {
    cleanupSidebar()
    setSidebar(newElement ?? <></>)
    cleanupSidebar = cleanup ?? (() => {})
  }

  const [sensors, setSensors] = createStore<SensorData[]>([])

  // store callbacks used to handle drag events
  const [getDragCallback, setDragCallback] =
    createSignal<(event: MouseEvent) => unknown>()
  const [getDragStopCallback, setDragStopCallback] =
    createSignal<(event: MouseEvent) => unknown>()
  // will be set to a function to enable the drag shield
  let enableDrag: undefined | (() => unknown)
  const setEnableDrag = (callback: () => unknown) => {
    enableDrag = callback
  }

  // open the drag shield until drag is over
  // pass events to callbacks as directed while dragging
  const startDrag = (
    onDrag: (event: MouseEvent) => unknown,
    onDragStop: (event: MouseEvent) => unknown,
  ) => {
    // console.log('starting drag')
    // console.log(`Enable drag set: ${enableDrag !== undefined}`)
    setDragCallback(() => onDrag)
    setDragStopCallback(() => onDragStop)
    enableDrag?.()
  }

  function handleIP() {
    const ip = document.getElementById("ipaddress") as HTMLInputElement;
    console.log(ip.value);
    window.electronAPI.onIPReceived(ip.value);
  }

  return (
    <>
      <DragContext.Provider value={{ startDrag }}>
        <CageContext.Provider value={cage}>
          <SidebarContext.Provider value={{ setSidebar: setSidebarContent }}>
            <SensorsContext.Provider
              value={{
                sensors,
                setSensors,
              }}
            >
              <div class="w-screen h-screen flex bg-base-100">
                {/* unhandled clicks in this dev will close the sidebar */}
                <div
                  class="size-full"
                  onClick={() => setSidebarContent()}
                >
                  <div class="flex flex-col size-full">
                    <div class="flex mx-[35px] mt-4 p-2 rounded-md bg-base-200 space-x-2">
                      <input
                        type="text"
                        id="ipaddress"
                        placeholder="IP address"
                      />
                      <button onClick={handleIP}>Submit</button>
                      <CreateSensorButton />
                      <ClearSensorsButton />
                      <CreateLaunchMissileButton />
                      <CageSettingsButton setCage={setCage} />
                      <CoordinatorConnectionButton />
                      <QuitButton
                        onClick={() => closeAppConfirmRef?.showModal()}
                      />
                    </div>
                    <Grid />
                  </div>
                </div>
                <Sidebar>
                  <>{sidebar()}</>
                </Sidebar>
              </div>
            </SensorsContext.Provider>
          </SidebarContext.Provider>
        </CageContext.Provider>
      </DragContext.Provider>

      {/* modal for confirming user's intent to exit app */}
      <QuitConfirmation ref={closeAppConfirmRef} />

      {/* Used to catch mouse events first when dragging something */}
      <DragShield
        setEnable={setEnableDrag}
        onDrag={getDragCallback()}
        onDragEnd={getDragStopCallback()}
      />
    </>
  )
}
