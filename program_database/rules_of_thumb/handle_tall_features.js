(machine) => {
    const hasXZPlatform = (blocks) => {
        const platforms = blocks.filter(block => block.attributes.isPlatform);
        const whetherEachPlatformIsXZ = platforms.map((platform) => {
            return !platform.attributes.isImmobile
                && hasXZActuatingAncestor(platform, blocks);
        });
        return whetherEachPlatformIsXZ.reduce((p0, p1) => p0 || p1, false);
    };
    const hasXZActuatingAncestor = (thisBlock, allBlocks) => {
        const thisBlockAncestor = getBlockAncestor(thisBlock, allBlocks);
        if (!thisBlockAncestor) {
            return false;
        }
        else {
            const ancestorIsXZ = thisBlockAncestor.actuationAxes.includes('x')
                || thisBlockAncestor.actuationAxes.includes('z');
            if (ancestorIsXZ) {
                return true;
            }
            else {
                return hasXZActuatingAncestor(thisBlockAncestor, allBlocks);
            }
        }
    };
    // Assumption: a block can have at most one ancestor
    const getBlockAncestor = (childBlock, allBlocks) => {
        return allBlocks.find((block) => {
            if (block.connections) {
                const currBlockChildrenNames = block.connections.map((cxn) => {
                    return cxn.child;
                });
                return currBlockChildrenNames.includes(childBlock.name);
            }
            return false;
        });
    };

    try {
        return !hasXZPlatform(machine.blocks);
    }
    catch (e) {
        return false;
    }
};

