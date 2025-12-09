import variables from 'config/variables';
import { useState, useEffect } from 'react';
import ReminderInfo from '../components/ReminderInfo';
import ErrorBoundary from '../../../../features/misc/modals/ErrorBoundary';
import { TAB_TYPES } from '../constants/tabConfig';

const Tabs = ({
  children,
  currentTab: activeTab,
  onSectionChange,
  resetToFirst,
  activeSection,
}) => {
  const [currentTab, setCurrentTab] = useState(children[0]?.props.label);
  const [currentName, setCurrentName] = useState(children[0]?.props.name);
  const [showReminder, setShowReminder] = useState(localStorage.getItem('showReminder') === 'true');

  const handleTabClick = (tab, name) => {
    if (name !== currentName) {
      variables.stats.postEvent('tab', `Opened ${name}`);
    }

    setCurrentTab(tab);
    setCurrentName(name);

    // Notify parent of section change
    if (onSectionChange) {
      onSectionChange(tab);
    }
  };

  // Notify parent of initial section on mount
  useEffect(() => {
    if (onSectionChange && currentTab) {
      onSectionChange(currentTab);
    }
  }, []);

  // Reset to first tab when requested
  useEffect(() => {
    if (resetToFirst) {
      setCurrentTab(children[0]?.props.label);
      setCurrentName(children[0]?.props.name);
      if (onSectionChange) {
        onSectionChange(children[0]?.props.label);
      }
    }
  }, [resetToFirst]);

  useEffect(() => {
    if (!activeSection || activeTab !== TAB_TYPES.SETTINGS) {
      return;
    }

    if (activeSection === currentTab) {
      return;
    }

    const matchedTab = children.find((tab) => tab.props.label === activeSection);

    if (matchedTab) {
      setCurrentTab(activeSection);
      setCurrentName(matchedTab.props.name);
      if (onSectionChange) {
        onSectionChange(activeSection);
      }
    }
  }, [activeSection, activeTab, children, currentTab, onSectionChange]);

  const handleHideReminder = () => {
    localStorage.setItem('showReminder', 'false');
    setShowReminder(false);
  };

  return (
    <div className="modalTabShell">
      <div className="modalTabContent">
        {showReminder && <ReminderInfo isVisible={showReminder} onHide={handleHideReminder} />}
        {children.map((tab, index) => {
          if (tab.props.label !== currentTab) {
            return null;
          }

          return (
            <ErrorBoundary key={`error-boundary-${index}`}>{tab.props.children}</ErrorBoundary>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
