(action, store) => {
    // Note: we un-implemented this rule of thumb because it was not working
    // right. Having a material intersect a void alone is no guarantee that
    // it cannot intersect any non-void (solid) parts of the blocks. In the
    // future, it would be easier to describe solids rather than voids.
    return true; };
